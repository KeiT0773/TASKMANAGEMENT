#!/usr/bin/env bash
# 画面を更新する（手順書 6.3）。稼働中にだけ使う。
#   bash infra/scripts/deploy-frontend.sh
#
# 1. frontend で npm run build を実行し、frontend/dist を作る
# 2. aws s3 sync で画面用の S3 バケットに置く（dist に無い古いファイルは消す）
# 3. CloudFront のキャッシュを無効にする
#
# AWS のリソースの構成は変えない（terraform apply をしない）ため、確認は求めない。

source "$(dirname "$0")/lib.sh"

usage() { sed -n '2,9p' "$0"; }
parse_common_args "$@"

show_identity
ensure_init
deploy_frontend

step "画面の更新が終わりました（反映まで 1〜2 分かかることがあります）"
info "URL: $(tf output -raw app_url)"
