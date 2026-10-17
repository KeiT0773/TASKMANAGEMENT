---
name: deploy-aws
description: このアプリを AWS に構築・更新・休止・再開するときの手順と約束。「デプロイして」「AWS に上げて」「再開して」「休止して」「止めて」「バックエンド（画面）を更新して」「terraform を実行して」「AWS の状態を確認して」と頼まれたとき、および infra/ の Terraform やスクリプトを実行するときに必ず使う。AWS の実物を変える操作は、内容を示して利用者の承認を得てから行う。
---

# AWS へのデプロイ手順（Claude 用）

構成は [docs/infra-design.md](../../../docs/infra-design.md)、人向けの手順と解説は [docs/aws-deployment-guide.md](../../../docs/aws-deployment-guide.md) にある。コマンドはすべて Git Bash で、リポジトリのルートから実行する。

## 0. 必ず守ること

| 約束 | 理由 |
| --- | --- |
| 作業の最初に `aws sts get-caller-identity` を実行し、アカウント（`512795167785`）と IAM ユーザーを報告する | 意図しないアカウントを操作しないため |
| AWS の実物を変える操作（`terraform apply` / `destroy`、`startup.sh`、`shutdown.sh`、`deploy-backend.sh`、`aws ... create-*` / `delete-*`）は、**何が起きるかを示して利用者が承認してから**実行する | 取り消せない操作や、課金が始まる操作であるため |
| スクリプトの `--yes` は、同じ内容を一度 `--yes` なしで実行して計画を示し、利用者が承認したあとにだけ付ける | `--yes` は確認を省略するため |
| `~/.aws/credentials` を読まない。アクセスキーを会話に出さない | キーの漏えいを防ぐ（手順書 4.4） |
| `rm` は使えない（`.claude/settings.json` で禁止）。一時ファイルは作業用フォルダーに置く | — |
| 作業の最後に「稼働中か休止中か」を報告する。稼働中なら、約 0.07 ドル / 時間かかり続けていることと、`shutdown.sh` で休止できることを伝える | 休止し忘れによる課金を防ぐ |
| 構成を変えるときは、Issue → ブランチ → PR で `infra/terraform/` を直し、**マージ後の main で** apply する | ブランチのコードで apply すると、AWS の実物が main より先に進んでしまう（手順書 6.4） |
| リソースの規模を設計書 2.1 の上限より大きくしない | 要件定義書 7.「費用」 |
| アクセス元の制限（CloudFront Functions）を外したり、IPv4 や自宅以外のネットワークを許可リストに加えたりしない。許可リストはスクリプトが自動で取得する | 要件定義書 7.「アクセス制御」（自宅のネットワークからだけ。設計書 6.5） |
| 金額をこのファイルに書くときは「0.07 ドル」のように書き、ドル記号と数字を続けない | スキルの読み込み時に、ドル記号と数字の組が引数に置き換わってしまうため |

## 1. いまの状態を調べる（読み取りだけ。承認は不要）

```bash
aws sts get-caller-identity
terraform -chdir=infra/terraform state list                      # 空なら休止中
aws rds describe-db-instances --db-instance-identifier taskmanagement --query 'DBInstances[0].DBInstanceStatus' --output text
aws rds describe-db-snapshots --snapshot-type manual --query 'DBSnapshots[].[DBSnapshotIdentifier,SnapshotCreateTime]' --output table
terraform -chdir=infra/terraform output app_url                   # 稼働中なら URL
```

`terraform` が「Backend initialization required」と言うときは、`terraform -chdir=infra/terraform init -backend-config="bucket=taskmanagement-tfstate-512795167785"` を実行する（state を読むだけの準備で、AWS には何も作らない）。

## 2. 操作ごとの流れ

どの操作も **「1 回目は `--yes` なしで実行 → 出力（計画の集計や対象）を利用者に要約して示す → 承認後に `--yes` 付きで実行」** の 2 段階にする。スクリプトは、端末から入力できないときは確認の手前で止まるので、1 回目は安全に実行できる。

| 頼まれたこと | 1 回目（確認用） | 承認後 | 所要時間 |
| --- | --- | --- | --- |
| 再開・初回の構築 | `bash infra/scripts/startup.sh` | `bash infra/scripts/startup.sh --yes` | 20〜30 分 |
| 休止 | `bash infra/scripts/shutdown.sh` | `bash infra/scripts/shutdown.sh --yes` | 15〜25 分 |
| バックエンドの更新 | `bash infra/scripts/deploy-backend.sh` | `bash infra/scripts/deploy-backend.sh --yes` | 5〜10 分 |
| 画面の更新 | — | `bash infra/scripts/deploy-frontend.sh`（構成を変えないため確認なし。ただし実行することは事前に伝える） | 2〜3 分 |
| 自宅のネットワーク番号が変わった（画面が 403 になる） | `bash infra/scripts/update-allowed-ip.sh` | `bash infra/scripts/update-allowed-ip.sh --yes` | 2〜5 分 |

時間がかかるコマンドは、`run_in_background` で実行して完了を待つ。

### 利用者に示す内容

- **startup**：復元するスナップショットの名前（無ければ「DB は空から始まる」）、アクセスを許可するネットワーク（`xxxx:xxxx:xxxx:xxxx::/64`）、`Plan: N to add, 0 to change, 0 to destroy`、課金が始まること（約 0.07 ドル / 時間）
- **shutdown**：撤去する件数、スナップショットを取ってから消すこと、登録したカードは次の再開で戻ること、再開後は URL が変わること
- **deploy-backend**：イメージのタグ（コミット）、`Plan:` の集計。タスク定義が作り直し（`-/+`）になるのは正常

### スクリプトが止めたとき

- 「想定外の削除・作り直しが含まれています」：**`--yes` を付けて押し切らない。** 表示されたリソースと原因を利用者に伝える。RDS（`aws_db_instance.main`）の作り直しはデータの消失につながる
- 「backend/ にコミットしていない変更があります」：コミットしてから実行し直す（イメージのタグとコードを一致させるため）
- 「Docker が起動していません」：利用者に Docker Desktop の起動を頼む
- 「IPv6 で通信できません」：アプリは自宅の IPv6 のネットワークからだけ使える。利用者に IPv6 の接続（ルーター、VPN）を確かめてもらう
- それ以外のエラーは、手順書 9. のトラブルシューティングで原因を調べ、分かったことを報告してから次の操作を相談する

## 3. 確認（稼働中）

```bash
APP_URL=$(terraform -chdir=infra/terraform output -raw app_url)
curl -6 -i "${APP_URL}/api/health/db"  # 200（自宅の IPv6 から）
curl -6 -i "${APP_URL}/api/cards"      # 200
curl -4 -i "${APP_URL}/api/health"     # 403（IPv4 は拒否される。設計どおり）
MSYS_NO_PATHCONV=1 aws logs tail /ecs/taskmanagement-backend --since 30m
```

## 4. 作業の終わりに報告すること

- 稼働中か休止中か（`terraform state list` が空かどうか）
- 稼働中なら URL と、約 0.07 ドル / 時間かかっていること
- 残っているスナップショットの一覧
- 手順書と実際の動きが違った点があれば、その内容（手順書を直す Issue を提案する）
