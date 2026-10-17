# データベース（RDS for PostgreSQL）と DB パスワード。インフラ設計書 8.・9.。
# 規模は無料利用枠と同じ範囲を上限とする（2.1）。

locals {
  restore_from_snapshot = var.db_snapshot_identifier != ""
}

# DB パスワード。英数字 32 文字（9.1）。
# 休止（destroy）で消え、再開のたびに作り直される。
resource "random_password" "db" {
  length  = 32
  special = false # 接続文字列や環境変数で扱いやすいよう、記号を含めない
}

# パスワードの保管先。無料の SSM パラメータストアの標準パラメータ（9.1）。
# ECS のタスク定義から読み、環境変数 SPRING_DATASOURCE_PASSWORD としてコンテナに渡す（ecs.tf）。
resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project}/db-password"
  type  = "SecureString" # AWS 管理の鍵（aws/ssm）で暗号化する
  tier  = "Standard"     # 標準パラメータは無料
  value = random_password.db.result
}

# RDS を置くサブネット（プライベートサブネット 2 つ）
resource "aws_db_subnet_group" "main" {
  name       = var.project
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier = var.project # 手順書の aws rds コマンドは、この名前（taskmanagement）を前提にしている

  # --- 作成元（8.1） ---
  # db_snapshot_identifier が指定されていれば、そのスナップショットから復元する。
  snapshot_identifier = local.restore_from_snapshot ? var.db_snapshot_identifier : null

  engine         = "postgres"
  engine_version = "16" # メジャー版だけを指定し、マイナー版は RDS の既定に任せる

  # --- 規模（2.1 の上限） ---
  instance_class        = var.db_instance_class
  allocated_storage     = 20
  storage_type          = "gp3"
  storage_encrypted     = true
  multi_az              = false
  max_allocated_storage = null # ストレージの自動拡張はしない

  # --- DB 名とユーザー（ローカルの compose.yaml と同じ名前） ---
  # スナップショットから復元するときは、スナップショットの中の値が使われるため指定しない。
  db_name  = local.restore_from_snapshot ? null : var.project
  username = local.restore_from_snapshot ? null : var.project
  # 復元したときも、復元の直後にこの値へ変更される（8.1）。
  password = random_password.db.result

  # --- ネットワーク ---
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # --- バックアップと削除（8.、8.1） ---
  backup_retention_period  = 1
  delete_automated_backups = true
  copy_tags_to_snapshot    = true
  skip_final_snapshot      = true # 休止前のスナップショットは shutdown.sh が取る
  deletion_protection      = false

  # --- 監視（2.1：有料の監視は使わない） ---
  performance_insights_enabled = false
  monitoring_interval          = 0

  auto_minor_version_upgrade = true
  apply_immediately          = true

  lifecycle {
    # 作成元（スナップショット名など）は作るときにだけ使う。
    # 稼働中に terraform.tfvars の db_snapshot_identifier が変わっても、DB を作り直さない（データが消えるため）。
    ignore_changes = [snapshot_identifier, db_name, username]
  }
}
