# ネットワーク：VPC、サブネット、インターネットゲートウェイ、ルートテーブル、セキュリティグループ。
# インフラ設計書 5.。NAT Gateway は使わない（5.2）。

locals {
  # ALB と RDS は 2 つ以上の AZ のサブネットを必要とするため、2 つの AZ を使う（5.1）。
  azs = ["${var.region}a", "${var.region}c"]
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true # RDS のエンドポイント名を、VPC の中で IP アドレスに変換するため
  enable_dns_hostnames = true

  tags = { Name = var.project }
}

# --- サブネット -------------------------------------------------------------
# パブリック：ECS タスクを置く（10.0.0.0/24、10.0.1.0/24）
resource "aws_subnet" "public" {
  count = length(local.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = local.azs[count.index]

  tags = { Name = "${var.project}-public-${substr(local.azs[count.index], -1, 1)}" }
}

# プライベート：ALB と RDS を置く（10.0.10.0/24、10.0.11.0/24）
resource "aws_subnet" "private" {
  count = length(local.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${10 + count.index}.0/24"
  availability_zone = local.azs[count.index]

  tags = { Name = "${var.project}-private-${substr(local.azs[count.index], -1, 1)}" }
}

# --- インターネットへの出入口と経路 -------------------------------------------
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = var.project }
}

# パブリックサブネット用：インターネット宛て（0.0.0.0/0）は IGW へ
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project}-public" }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# プライベートサブネット用：VPC の中だけ（経路を追加しない）
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project}-private" }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- セキュリティグループ（5.3） -----------------------------------------------
# 受信は許可したものだけを通す。送信は全許可。

# CloudFront が送信元として使う IP アドレスの一覧（AWS が管理する）
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# ALB：CloudFront からの 80 番だけを受け付ける
resource "aws_security_group" "alb" {
  name        = "${var.project}-alb"
  description = "ALB: HTTP from CloudFront only"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "alb_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from CloudFront"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ECS タスク：ALB からの 8080 番だけを受け付ける
resource "aws_security_group" "ecs" {
  name        = "${var.project}-ecs"
  description = "ECS tasks: 8080 from ALB only"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "Spring Boot from ALB"
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
  referenced_security_group_id = aws_security_group.alb.id
}

# 送信は全許可：ECR・SSM・CloudWatch Logs への通信と、RDS への接続に使う
resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  security_group_id = aws_security_group.ecs.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# RDS：ECS タスクからの 5432 番だけを受け付ける
resource "aws_security_group" "rds" {
  name        = "${var.project}-rds"
  description = "RDS: PostgreSQL from ECS tasks only"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from ECS tasks"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.ecs.id
}
