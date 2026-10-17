# Spring Boot のコンテナを動かす ECS（Fargate Spot）。インフラ設計書 7.。

locals {
  # 規模は 2.1 の上限に固定する（変数にしない）。
  task_cpu    = 512  # 0.5 vCPU
  task_memory = 1024 # 1 GB
}

# --- クラスター ---------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = var.project

  # Container Insights（詳細な監視）は有料のため使わない（2.1）
  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

# このクラスターで使える起動方式。既定は Fargate Spot（7.1）。
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE_SPOT", "FARGATE"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }
}

# --- タスク定義（どのイメージを、どれだけの CPU・メモリと設定で動かすか） -------------
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.task_cpu
  memory                   = local.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64" # Windows の PC で作るイメージがそのまま動く（7.1）
  }

  container_definitions = jsonencode([{
    name      = "backend"
    image     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
    essential = true

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    # 7.2：本番の設定。接続先は RDS の作成結果から組み立てる。
    # RDS for PostgreSQL 16 は暗号化した接続を必須にしているため、sslmode=require を付ける。
    environment = [
      { name = "SPRING_PROFILES_ACTIVE", value = "prod" },
      { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.project}?sslmode=require" },
      { name = "SPRING_DATASOURCE_USERNAME", value = var.project },
    ]

    # 9.1：DB パスワードは SSM パラメータストアから注入する（タスク定義には値が現れない）
    secrets = [
      { name = "SPRING_DATASOURCE_PASSWORD", valueFrom = aws_ssm_parameter.db_password.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "backend"
      }
    }
  }])

  lifecycle {
    precondition {
      condition     = var.backend_image_tag != ""
      error_message = "backend_image_tag が空です。イメージを ECR に登録し、terraform.tfvars にタグを書いてください（手順書 6.1 (4)）。"
    }
  }
}

# --- サービス（タスクを常に 1 つ動かし続ける） -----------------------------------
resource "aws_ecs_service" "backend" {
  name            = "${var.project}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1

  # Fargate Spot で動かす（7.1）。中断されたときは、サービスが自動で新しいタスクを起動する。
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }

  # パブリックサブネットに置き、パブリック IP を持たせる（NAT Gateway を使わないため。5.2）。
  # 受信はセキュリティグループで ALB からの 8080 番だけに限る（5.3）。
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "backend"
    container_port   = 8080
  }

  # 起動直後のヘルスチェックの失敗を無視する時間。0.5 vCPU では Spring Boot の起動に 1 分前後かかるため。
  health_check_grace_period_seconds = 180

  # 新しいタスクが起動できないまま入れ替えが続くのを止め、前のタスク定義に戻す
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_ecs_cluster_capacity_providers.main,
    aws_lb_listener.http,
  ]
}
