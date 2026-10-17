# 画面の配信（S3 + CloudFront）と、API への振り分け（VPC オリジン）。インフラ設計書 6.。
#   /*      → S3（画面の静的ファイル。OAC で CloudFront からだけ読める）
#   /api/*  → 内部 ALB（VPC オリジン。インターネットからは直接届かない）
# どちらも、自宅の IPv6 のネットワーク以外からの要求は、CloudFront Functions が 403 で拒否する（6.5）。

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

# --- アクセス元の制限（CloudFront Functions、6.5） ----------------------------------
# 許可した IPv6 のネットワーク番号以外からの要求に 403 を返す。コードは functions/viewer-allowlist.js。
resource "aws_cloudfront_function" "viewer_allowlist" {
  name    = "${var.project}-viewer-allowlist"
  runtime = "cloudfront-js-2.0"
  comment = "Allow only the home IPv6 network"
  publish = true # 保存と同時に本番（LIVE）に反映する

  # コードの中の目印を、許可リスト（JSON の配列）に置き換える
  code = replace(
    file("${path.module}/functions/viewer-allowlist.js"),
    "%%ALLOWED_PREFIXES%%",
    jsonencode(var.allowed_viewer_ipv6_prefixes)
  )

  lifecycle {
    precondition {
      condition     = length(var.allowed_viewer_ipv6_prefixes) > 0
      error_message = "allowed_viewer_ipv6_prefixes が空です。誰もアクセスできなくなるため中止しました。startup.sh / update-allowed-ip.sh を使うか、terraform.tfvars に自宅の IPv6 のネットワーク番号を書いてください（手順書 6.5）。"
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

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.viewer_allowlist.arn
    }
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

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.viewer_allowlist.arn
    }
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
