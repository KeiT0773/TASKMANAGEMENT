# API の要求を ECS タスクへ渡すロードバランサー（ALB）。インフラ設計書 4.・6.3・7.3。
# 内部（internal）として作り、CloudFront の VPC オリジン（frontend.tf）からだけ届くようにする。

resource "aws_lb" "api" {
  name               = "${var.project}-api"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.private[*].id
}

# 転送先（ECS タスクの IP アドレス）の一覧と、その死活の確認方法
resource "aws_lb_target_group" "api" {
  name        = "${var.project}-api"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip" # Fargate のタスクは IP アドレスで登録される
  vpc_id      = aws_vpc.main.id

  # タスクを入れ替えるとき、古いタスクへの通信が終わるのを待つ時間（既定の 300 秒は長いので短くする）
  deregistration_delay = 30

  # DB に触れない /api/health で死活を確認する（7.3）
  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
