# 実行後に表示・取得する値。スクリプトと手順書は `terraform output -raw <名前>` で読む。

output "app_url" {
  description = "画面の URL（再開するたびに変わる）"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront のディストリビューション ID（キャッシュの無効化に使う）"
  value       = aws_cloudfront_distribution.main.id
}

output "frontend_bucket_name" {
  description = "画面のファイルを置く S3 バケットの名前"
  value       = aws_s3_bucket.frontend.bucket
}

output "ecr_repository_url" {
  description = "バックエンドのイメージを登録する ECR のアドレス"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS のクラスター名"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS のサービス名"
  value       = aws_ecs_service.backend.name
}

output "target_group_arn" {
  description = "ALB のターゲットグループの ARN（タスクの死活の確認に使う）"
  value       = aws_lb_target_group.api.arn
}

output "db_instance_identifier" {
  description = "RDS の識別子（スナップショットの作成に使う）"
  value       = aws_db_instance.main.identifier
}

output "log_group_name" {
  description = "バックエンドのログのロググループ名"
  value       = aws_cloudwatch_log_group.backend.name
}
