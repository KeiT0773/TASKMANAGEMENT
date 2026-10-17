#!/usr/bin/env bash
# infra/scripts/*.sh が共通で使う関数。直接は実行しない（source で読み込む）。
# Git Bash で動かす前提（手順書 1.2）。

set -euo pipefail

# --- 場所 -------------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="${REPO_ROOT}/infra/terraform"
TFVARS="${TF_DIR}/terraform.tfvars"
PROJECT="taskmanagement"
REGION="ap-northeast-1"

# --- 表示 -------------------------------------------------------------------------
step() { printf '\n==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n[中止] %s\n' "$*" >&2; exit 1; }

tf() { terraform -chdir="${TF_DIR}" "$@"; }

# --- オプション -------------------------------------------------------------------
# --yes：確認を省略する。Claude が実行するときは、利用者が承認したあとにだけ付ける（手順書 8.）。
ASSUME_YES=false
parse_common_args() {
  for arg in "$@"; do
    case "$arg" in
      --yes|-y) ASSUME_YES=true ;;
      -h|--help) usage; exit 0 ;;
      *) die "不明なオプション: $arg" ;;
    esac
  done
}

# 確認を求める。--yes があれば省略。端末から入力できない（Claude などが実行している）ときは中止する。
confirm() {
  local message="$1"
  if [ "$ASSUME_YES" = true ]; then
    info "（--yes が指定されているため、確認を省略）"
    return 0
  fi
  if [ ! -t 0 ]; then
    die "確認の入力ができないため、ここで止めました。内容を確認したうえで --yes を付けて実行し直してください。"
  fi
  local answer
  read -r -p "${message} [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) return 0 ;;
    *) die "中止しました（何も変更していません）。" ;;
  esac
}

# --- 事前の確認 -------------------------------------------------------------------
# 誰として、どのアカウントを操作するかを表示する（手順書 4.2、8.）
show_identity() {
  step "AWS の認証を確認"
  ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)" \
    || die "AWS に接続できません。aws configure の設定を確認してください（手順書 4.2）。"
  info "アカウント: ${ACCOUNT_ID}"
  info "操作する人: $(aws sts get-caller-identity --query Arn --output text)"
  STATE_BUCKET="${PROJECT}-tfstate-${ACCOUNT_ID}"
}

require_docker() {
  docker info >/dev/null 2>&1 || die "Docker が起動していません。Docker Desktop を起動してから実行してください。"
}

# Terraform が state の保存先（S3）に接続済みか確かめ、未接続なら init する（手順書 6.1 (2)）
ensure_init() {
  if [ ! -f "${TF_DIR}/.terraform/terraform.tfstate" ]; then
    step "terraform init（state の保存先: ${STATE_BUCKET}）"
    tf init -input=false -backend-config="bucket=${STATE_BUCKET}"
  fi
}

# terraform.tfvars が無ければ記入例から作る
ensure_tfvars() {
  if [ ! -f "${TFVARS}" ]; then
    cp "${TF_DIR}/terraform.tfvars.example" "${TFVARS}"
    info "terraform.tfvars を記入例から作成しました"
  fi
}

# terraform.tfvars の 1 項目を書き換える（無ければ末尾に追加）。
# set_tfvar は文字列として（"..." で囲んで）、set_tfvar_raw は値をそのまま（リストなど）書く。
set_tfvar_raw() {
  local key="$1" value="$2"
  ensure_tfvars
  if grep -qE "^${key}[[:space:]]*=" "${TFVARS}"; then
    sed -i "s|^${key}[[:space:]]*=.*|${key} = ${value}|" "${TFVARS}"
  else
    printf '%s = %s\n' "${key}" "${value}" >> "${TFVARS}"
  fi
  info "terraform.tfvars: ${key} = ${value}"
}

set_tfvar() {
  set_tfvar_raw "$1" "\"$2\""
}

# --- アクセス元の制限（インフラ設計書 6.5） -----------------------------------------
# この PC の IPv6 アドレスを外部のサービスで調べ、先頭 64 ビット（自宅のネットワーク番号）を
# "xxxx:xxxx:xxxx:xxxx::/64" の形で出力する。IPv6 で通信できなければ中止する。
detect_ipv6_prefix() {
  local addr
  addr="$(curl -s -6 -m 10 https://api6.ipify.org)" || true
  [ -n "${addr}" ] || die "IPv6 で通信できません。アプリは自宅の IPv6 のネットワークからだけ使えるため、IPv6 の接続を確かめてください（手順書 9.6）。"
  # :: の省略を展開し、先頭 4 つの区切りを取り出す（node は画面のビルドで使うため、必ず入っている）
  node -e '
    const a = process.argv[1];
    const [h, t] = a.split("::");
    const head = h ? h.split(":") : [];
    const tail = t ? t.split(":") : [];
    const parts = a.includes("::") ? [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail] : head;
    if (parts.length !== 8 || !parts.every((p) => /^[0-9a-f]{1,4}$/i.test(p))) process.exit(1);
    console.log(parts.slice(0, 4).map((p) => parseInt(p, 16).toString(16)).join(":") + "::/64");
  ' "${addr}" || die "IPv6 アドレスとして読めない値が返りました: ${addr}"
}

# 自宅のネットワーク番号を調べて、terraform.tfvars の許可リストに書く
configure_allowlist() {
  step "この PC の IPv6 のネットワーク番号を調べる（アクセスを許可する範囲）"
  ALLOWED_PREFIX="$(detect_ipv6_prefix)"
  info "許可するネットワーク: ${ALLOWED_PREFIX}（このネットワークにつながった端末からだけ使える）"
  set_tfvar_raw allowed_viewer_ipv6_prefixes "[\"${ALLOWED_PREFIX}\"]"
}

# --- 計画の検査 -------------------------------------------------------------------
# 保存した計画（tfplan）の集計を表示する
show_plan_summary() {
  local plan_file="$1"
  tf show -no-color "${plan_file}" | grep -E '^(Plan:|No changes)' || true
}

# 計画に「削除」や「作り直し」が含まれていないか調べる。
# 引数に渡したリソースの種類（例：aws_ecs_task_definition）だけは許可する。
# 例：バックエンドの更新では、タスク定義が新しい版に作り直されるのは正常（手順書 6.2）。
assert_no_unexpected_destroy() {
  local plan_file="$1"; shift
  local offending allowed_type
  # 計画の中の「# <リソース> will be destroyed / must be replaced」の行を集める
  offending="$(tf show -no-color "${plan_file}" | grep -E '^  # .* (will be destroyed|must be replaced)' || true)"
  # 許可した種類の行を取り除く
  for allowed_type in "$@"; do
    offending="$(printf '%s\n' "${offending}" | grep -v "^  # ${allowed_type}\." || true)"
  done
  if [ -n "${offending}" ]; then
    printf '%s\n' "${offending}" >&2
    die "計画に想定外の削除・作り直しが含まれています（上の一覧）。データが消えるおそれがあるため中止しました。"
  fi
}

# --- イメージ・ECS・画面 ----------------------------------------------------------
# ECR のアドレス。ECR だけを先に作った直後（-target）は terraform output に値が無いことがあるため、
# AWS から直接読む。
ecr_url() {
  aws ecr describe-repositories --repository-names "${PROJECT}-backend" \
    --query 'repositories[0].repositoryUri' --output text
}

# 今のコミットのイメージを作って ECR に登録し、terraform.tfvars のタグを書き換える（手順書 6.1 (4)）。
# 同じタグが登録済みなら作り直さない（ECR はタグの上書きを禁止しているため）。
build_and_push_image() {
  require_docker
  if [ -n "$(git -C "${REPO_ROOT}" status --porcelain -- backend)" ]; then
    die "backend/ にコミットしていない変更があります。イメージのタグ（コミットハッシュ）と中身が食い違うため、コミットしてから実行してください。"
  fi
  IMAGE_TAG="$(git -C "${REPO_ROOT}" rev-parse --short HEAD)"
  local url; url="$(ecr_url)"

  if aws ecr describe-images --repository-name "${PROJECT}-backend" --image-ids imageTag="${IMAGE_TAG}" >/dev/null 2>&1; then
    step "イメージ ${IMAGE_TAG} は ECR に登録済みのため、作成を省略"
  else
    step "イメージを作成して ECR に登録（タグ: ${IMAGE_TAG}）"
    aws ecr get-login-password --region "${REGION}" \
      | docker login --username AWS --password-stdin "${url%%/*}"
    docker build -t "${url}:${IMAGE_TAG}" "${REPO_ROOT}/backend"
    docker push "${url}:${IMAGE_TAG}"
  fi
  set_tfvar backend_image_tag "${IMAGE_TAG}"
}

wait_service_stable() {
  step "ECS のタスクが起動して、ALB のヘルスチェックに合格するのを待つ（最長 10 分）"
  aws ecs wait services-stable --cluster "${PROJECT}" --services "${PROJECT}-backend" \
    || die "タスクが安定しませんでした。手順書 9.1 の手順でログと止まった理由を確認してください。"
  info "完了"
}

# 画面をビルドして S3 に置き、CloudFront のキャッシュを無効にする（手順書 6.3）
deploy_frontend() {
  local bucket dist_id
  bucket="$(tf output -raw frontend_bucket_name 2>/dev/null)" \
    || die "画面用のバケットがありません。休止中なら startup.sh で再開してください。"
  dist_id="$(tf output -raw cloudfront_distribution_id)"

  step "画面をビルド（frontend/dist）"
  if [ -n "$(git -C "${REPO_ROOT}" status --porcelain -- frontend)" ]; then
    info "注意：frontend/ にコミットしていない変更があります。その変更も含めて配置されます。"
  fi
  (
    cd "${REPO_ROOT}/frontend"
    [ -d node_modules ] || npm ci
    npm run build
  )

  step "S3 に配置（s3://${bucket}）"
  aws s3 sync "${REPO_ROOT}/frontend/dist" "s3://${bucket}" --delete

  step "CloudFront のキャッシュを無効化"
  MSYS_NO_PATHCONV=1 aws cloudfront create-invalidation --distribution-id "${dist_id}" --paths "/*" \
    --query 'Invalidation.[Id,Status]' --output text
}

# --- その他 -----------------------------------------------------------------------
db_exists() {
  aws rds describe-db-instances --db-instance-identifier "${PROJECT}" >/dev/null 2>&1
}

# スナップショット（taskmanagement-YYYYMMDD-HHMM）を古い順に 1 行ずつ出力する
list_snapshots_oldest_first() {
  aws rds describe-db-snapshots --snapshot-type manual \
    --query "sort_by(DBSnapshots[?starts_with(DBSnapshotIdentifier, '${PROJECT}-') && Status=='available'], &SnapshotCreateTime)[].DBSnapshotIdentifier" \
    --output text | tr '\t' '\n' | sed '/^$/d;/^None$/d'
}
