# ECS が使う IAM ロール。インフラ設計書 10.。
# タスクロール（アプリが AWS を呼ぶための身分）は、アプリが AWS を呼ばないため作らない。

# タスク実行ロール：ECS がタスクを起動するときに名乗る身分
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project}-ecs-task-execution"

  # このロールを名乗ってよいのは ECS のタスクだけ
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# ECR からのイメージの取得と、CloudWatch Logs への書き込み（AWS 管理ポリシー）
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# DB パスワードのパラメータ 1 つだけを読む。
# AWS 管理の鍵（aws/ssm）で暗号化しているため、kms:Decrypt の許可は不要。
resource "aws_iam_role_policy" "ecs_read_db_password" {
  name = "read-db-password"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters"]
      Resource = aws_ssm_parameter.db_password.arn
    }]
  })
}
