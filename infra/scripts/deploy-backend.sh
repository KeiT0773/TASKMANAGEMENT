#!/usr/bin/env bash
# バックエンドを更新する（手順書 6.2）。稼働中にだけ使う。
#   bash infra/scripts/deploy-backend.sh          計画を表示し、確認してから適用する
#   bash infra/scripts/deploy-backend.sh --yes    確認を省略する（計画を確認済みのとき）
#
# 1. 今のコミットのイメージを作って ECR に登録する
# 2. terraform.tfvars の backend_image_tag を書き換える
# 3. terraform plan → 確認 → apply（タスク定義の新しい版を作り、ECS がタスクを入れ替える）
# 4. 入れ替えが終わるのを待つ

source "$(dirname "$0")/lib.sh"

usage() { sed -n '2,10p' "$0"; }
parse_common_args "$@"

show_identity
ensure_init
db_exists || die "アプリが稼働していません（休止中）。再開は bash infra/scripts/startup.sh で行ってください。"

build_and_push_image

step "terraform plan"
tf plan -input=false -out=tfplan
show_plan_summary tfplan
# タスク定義は変更のたびに新しい版に作り直されるのが正常。それ以外の削除・作り直しがあれば止める。
assert_no_unexpected_destroy tfplan aws_ecs_task_definition

confirm "この計画を適用しますか？"
step "terraform apply"
tf apply -input=false tfplan
rm -f "${TF_DIR}/tfplan"

wait_service_stable
step "バックエンドの更新が終わりました（イメージ: ${IMAGE_TAG}）"
info "URL: $(tf output -raw app_url)"
