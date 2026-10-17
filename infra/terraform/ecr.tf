# コンテナイメージの置き場所（ECR）。インフラ設計書 4.・7.4。
# 初回と再開時は、このリポジトリだけを先に作ってからイメージを登録する（手順書 6.1 (3)）。

resource "aws_ecr_repository" "backend" {
  name = "${var.project}-backend"

  # 同じタグでの上書きを禁止する。タグ（コミットハッシュ）とイメージの中身を常に一致させるため。
  image_tag_mutability = "IMMUTABLE"

  # 休止（terraform destroy）のとき、イメージが残っていても消せるようにする。
  force_delete = true

  # 登録時の脆弱性の簡易検査（基本スキャン。無料）。
  image_scanning_configuration {
    scan_on_push = true
  }
}

# 古いイメージを自動で消す。新しい順に 3 つだけ残す（インフラ設計書 2.1）。
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 3 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 3
      }
      action = { type = "expire" }
    }]
  })
}
