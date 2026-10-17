# 画面の配信（S3 + CloudFront）と、API への振り分け（VPC オリジン）。インフラ設計書 6.。
#   /*      → S3（画面の静的ファイル。OAC で CloudFront からだけ読める）
#   /api/*  → 内部 ALB（VPC オリジン。インターネットからは直接届かない）

data "aws_caller_identity" "current" {}

# --- 画面用の S3 バケット ----------------------------------------------------------
resource "aws_s3_bucket" "frontend" {
  # バケット名は世界で一意にする必要があるため、アカウント ID を付ける
  bucket = "${var.project}-frontend-${data.aws_caller_identity.current.account_id}"

  # 休止（terraform destroy）のとき、ファイルが残っていても消せるようにする
  force_destroy = true
}

# パブリックアクセスをすべて禁止する（6.2）
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

# このディストリビューションの CloudFront からの読み取りだけを許可する（OAC、6.2）
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.main.arn }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project}-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# --- 内部 ALB への入口（VPC オリジン、6.3） ----------------------------------------
resource "aws_cloudfront_vpc_origin" "api" {
  vpc_origin_endpoint_config {
    name                   = "${var.project}-api"
    arn                    = aws_lb.api.arn
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only" # ALB は HTTP だけを受け付ける（6.4）

    origin_ssl_protocols {
      items    = ["TLSv1.2"]
      quantity = 1
    }
  }
}

# --- AWS が用意しているキャッシュの設定（6.1） ---------------------------------------
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# --- ディストリビューション（CloudFront の本体） -------------------------------------
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  comment             = var.project
  default_root_object = "index.html"
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = "PriceClass_200" # 日本を含む配信拠点を使う（全拠点の PriceClass_All は不要）

  origin {
    origin_id                = "s3-frontend"
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    origin_id   = "alb-api"
    domain_name = aws_lb.api.dns_name

    vpc_origin_config {
      vpc_origin_id = aws_cloudfront_vpc_origin.api.id
    }
  }

  # 既定：画面のファイルを S3 から返す。キャッシュする
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress               = true
  }

  # /api/*：バックエンドへ転送する。キャッシュせず、ヘッダー・クエリ・本文をすべて渡す
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "alb-api"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # *.cloudfront.net の既定の証明書で HTTPS にする（独自ドメインは使わない。6.4）
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
