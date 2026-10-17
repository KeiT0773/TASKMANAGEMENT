#!/usr/bin/env bash
# 休止から再開する（すべて作り直す）。初回の構築にも使える（手順書 7.3）。
#   bash infra/scripts/startup.sh          内容を表示し、確認してから構築する
#   bash infra/scripts/startup.sh --yes    確認を省略する（内容を確認済みのとき）
#
# 1. 最新のスナップショットを探し、terraform.tfvars の db_snapshot_identifier に書く（無ければ DB を新規作成）
# 2. この PC の IPv6 のネットワーク番号を調べ、アクセスを許可する範囲として書く（インフラ設計書 6.5）
# 3. ECR だけを先に作る
# 4. 今のコミットのイメージを作って ECR に登録する
# 5. terraform plan → apply（削除・作り直しが含まれていたら中止）
# 6. ECS のタスクが起動するのを待つ
# 7. 画面をビルドして配置する
# 8. /api/health/db を IPv6 で確かめ、新しい URL を表示する（URL は再開のたびに変わる）
#
# 稼働中は約 $0.07 / 時間かかる。使い終わったら shutdown.sh で休止する。

source "$(dirname "$0")/lib.sh"

usage() { sed -n '2,16p' "$0"; }
parse_common_args "$@"

show_identity
require_docker
ensure_init

if db_exists; then
  die "アプリは既に稼働しています。更新は deploy-backend.sh / deploy-frontend.sh で行ってください。"
fi

# --- 1. 復元するスナップショット ---
step "復元に使うスナップショットを探す"
SNAPSHOT="$(list_snapshots_oldest_first | tail -n 1)"
if [ -n "${SNAPSHOT}" ]; then
  info "最新のスナップショット: ${SNAPSHOT}（休止前のカードが戻ります）"
else
  info "スナップショットがありません。DB を新規に作ります（カードは空から始まります）"
fi
set_tfvar db_snapshot_identifier "${SNAPSHOT}"

# --- 2. アクセスを許可するネットワーク ---
configure_allowlist

# --- 確認の前に、作られるものの一覧を表示する ---
step "作成されるリソースの確認（イメージのタグは仮の値で計算）"
tf plan -input=false -var "backend_image_tag=preview" -out=tfplan-preview >/dev/null
show_plan_summary tfplan-preview
assert_no_unexpected_destroy tfplan-preview
rm -f "${TF_DIR}/tfplan-preview"
info "アクセスを許可するネットワーク: ${ALLOWED_PREFIX}（それ以外からは 403）"
info "稼働中は約 \$0.07 / 時間かかります（インフラ設計書 11.）。構築には 20〜30 分かかります。"

confirm "再開（構築）しますか？"

# --- 3. ECR ---
step "ECR を作成"
tf apply -input=false -auto-approve -target=aws_ecr_repository.backend

# --- 4. イメージ ---
build_and_push_image

# --- 5. 全体の構築 ---
step "terraform plan"
tf plan -input=false -out=tfplan
show_plan_summary tfplan
assert_no_unexpected_destroy tfplan
step "terraform apply（RDS と CloudFront の作成に時間がかかります）"
tf apply -input=false tfplan
rm -f "${TF_DIR}/tfplan"

# --- 6. ECS ---
wait_service_stable

# --- 7. 画面 ---
deploy_frontend

# --- 8. 確認 ---
APP_URL="$(tf output -raw app_url)"
step "動作確認（${APP_URL}/api/health/db）"
curl -6 -fsS --retry 20 --retry-delay 15 --retry-all-errors "${APP_URL}/api/health/db" \
  || die "API が応答しません。手順書 9.2 を確認してください。"
echo

step "再開しました"
info "URL: ${APP_URL}"
info "使い終わったら、bash infra/scripts/shutdown.sh で休止してください（稼働中は約 \$0.07 / 時間）。"
