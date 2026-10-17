# 外から渡す入力値。値は terraform.tfvars（Git に含めない）に書く。記入例は terraform.tfvars.example。

variable "region" {
  description = "AWS のリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project" {
  description = "リソース名の先頭に付ける名前。タグ Project にも使う"
  type        = string
  default     = "taskmanagement"
}

variable "backend_image_tag" {
  description = "ECS で動かすバックエンドのイメージのタグ（Git のコミットの短縮ハッシュ）。インフラ設計書 7.4"
  type        = string
  default     = ""
  # 空のままでは ECS のタスク定義を作れない。チェックは ecs.tf の precondition で行う
  # （ECR だけを先に作るとき（-target）には空でよいため、ここでは検証しない）。
}

variable "db_snapshot_identifier" {
  description = "DB を復元するスナップショットの名前。空なら DB を新規に作る。インフラ設計書 8.1"
  type        = string
  default     = ""
}

variable "allowed_viewer_ipv6_prefixes" {
  description = "アクセスを許可する IPv6 のネットワーク番号（例：[\"240d:1a:9e6:8c00::/64\"]）。インフラ設計書 6.5"
  type        = list(string)
  default     = []
  # 空のままでは CloudFront を作れない。チェックは frontend.tf の precondition で行う
  # （ECR だけを先に作るとき（-target）には空でよいため、ここでは検証しない）。

  validation {
    condition = alltrue([
      for p in var.allowed_viewer_ipv6_prefixes :
      can(cidrhost(p, 0)) && strcontains(p, ":") && can(regex("/(4[8-9]|5[0-9]|6[0-4])$", p))
    ])
    error_message = "allowed_viewer_ipv6_prefixes には、/48〜/64 の IPv6 のネットワーク番号を書いてください（例：240d:1a:9e6:8c00::/64）。IPv4 は使えません。"
  }
}

variable "db_instance_class" {
  description = "RDS のインスタンスクラス"
  type        = string
  default     = "db.t4g.micro"

  # 無料利用枠と同じ規模を上限とする（要件定義書 7.「費用」、インフラ設計書 2.1）。
  validation {
    condition     = contains(["db.t4g.micro", "db.t3.micro"], var.db_instance_class)
    error_message = "db_instance_class は db.t4g.micro か db.t3.micro にしてください（インフラ設計書 2.1 の上限）。"
  }
}
