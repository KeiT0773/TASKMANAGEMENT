# Spring Boot のログ（標準出力）の保管場所。インフラ設計書 4.・2.1。
# 見るときは：MSYS_NO_PATHCONV=1 aws logs tail /ecs/taskmanagement-backend --follow（手順書 9.1）

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project}-backend"
  retention_in_days = 7 # 常時無料の範囲（月 5 GB）に収める
}
