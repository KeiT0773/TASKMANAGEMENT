# タスク管理アプリ 開発フロー

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書名 | タスク管理アプリ 開発フロー |
| 版数 | 1.0 |
| 作成日 | 2026-09-19 |
| 最終更新日 | 2026-09-19 |
| 作成者 | KeiT0773 |
| ステータス | 確定 |
| 関連文書 | [要件定義書](requirements.md)、[CLAUDE.md](../CLAUDE.md) |

本書は、本プロジェクトにおけるソースコード・文書の変更手順を定める。Issue の起票からブランチの作成、Pull Request（以下 PR）を経て `main` へ反映されるまでの一連の流れと、それを担保する仕組みを記述する。

Claude Code が従う機械可読なルールは [CLAUDE.md](../CLAUDE.md) にあり、本書はその背景と全体像を人が読むためにまとめたものである。両者の内容は一致していなければならない。

### 1.1 変更履歴

| 版数 | 日付 | 変更内容 | 変更者 |
| --- | --- | --- | --- |
| 1.0 | 2026-09-19 | 初版作成。ブランチ規則、Issue 運用、PR 運用、ラベル定義、main ブランチ保護の方針を定義 | KeiT0773 |

---

## 2. 背景と方針

### 2.1 導入前の状態

本フローを導入する以前、リポジトリには次の問題があった。

- `main` ブランチに保護設定がなく、直接 push・force push・ブランチ削除がすべて可能だった
- Issue が一件も起票されておらず、「なぜその変更をしたのか」が記録として残っていなかった
- 過去の PR はすべて `test` という汎用ブランチから作られ、1 本のブランチが使い回されていた

個人開発であっても、作業の単位が記録に残らないと、後から経緯を追えず、複数の作業が混ざったまま `main` に入ってしまう。本プロジェクトは Web アプリケーション開発の流れを実践的に学ぶことも目的としているため、実務で一般的な開発フローをここで確立する。

### 2.2 三層での担保

ルールは文書に書くだけでは守られない。本プロジェクトでは次の 3 層で担保する。

| 層 | 仕組み | 効果 |
| --- | --- | --- |
| 規約 | [CLAUDE.md](../CLAUDE.md)、本書 | 何をすべきかを定義する |
| ローカル | `.claude/hooks/guard-main-branch.sh`（PreToolUse フック） | `main` 上での commit / push / merge を実行前に拒否する |
| リモート | GitHub Ruleset | 規約に反する push を GitHub 側が受け付けない |

ローカルのフックは「間違いに早く気付くため」、GitHub の Ruleset は「最終的に絶対に通さないため」にある。フックを無効化しても Ruleset は回避できない。

---

## 3. 作業の手順

### 3.1 全体の流れ

```
Issue を起票
  ↓
main を最新化してブランチを作成
  ↓
変更 → コミット → push
  ↓
PR を作成（Closes #<番号> を記載）
  ↓
squash マージ → Issue 自動クローズ・ブランチ自動削除
```

### 3.2 コマンド例

以下は Git Bash で実行する。

```bash
# 1. Issue を起票する
gh issue create

# 2. main を最新にしてからブランチを切る
git switch main
git pull --ff-only
git switch -c feat/12-card-create

# 3. 変更してコミットし、push する
git add docs/functional-requirements.md
git commit -m "feat: カード登録機能を追加"
git push -u origin feat/12-card-create

# 4. PR を作る
gh pr create

# 5. squash マージする
gh pr merge --squash
```

### 3.3 禁止事項

- `main` ブランチ上でのコミット
- `main` ブランチへの直接 push
- force push（`git push --force`、`git push +...`）
- `main` へのローカル merge（マージは必ず GitHub 上の PR で行う）
- `main` ブランチの削除

---

## 4. Issue の運用

### 4.1 起票の基準

**コードや文書を変更する作業は、必ず Issue から始める。** 一行の修正であっても例外としない。Issue はブランチ名と PR に番号として残り、変更の理由を後から辿るための唯一の入口になる。

### 4.2 テンプレート

`gh issue create` を実行すると、次の 3 種類から選択する。空の Issue は作成できない設定にしている。

| テンプレート | 用途 | 主な記入項目 |
| --- | --- | --- |
| 機能追加 | 新しい機能の実装 | 関連する機能 ID（FR-xx）、背景・目的、受け入れ基準、優先度 |
| バグ報告 | 既存機能の不具合 | 再現手順、期待する動作、実際の動作、発生環境 |
| その他作業 | 環境整備、リファクタリング、文書整備など | 作業内容、完了条件 |

機能追加テンプレートの「関連する機能 ID」は [機能要件書](functional-requirements.md) の FR-01〜FR-09 から選ぶ。これにより、要件書の記述と実装作業が相互に辿れるようになる。

### 4.3 ラベル

Issue と PR には種別ラベルを 1 つ、Issue には優先度ラベルを 1 つ付ける。

| 分類 | ラベル |
| --- | --- |
| 種別 | `type:feat` / `type:fix` / `type:docs` / `type:refactor` / `type:test` / `type:chore` |
| 優先度 | `priority:high` / `priority:medium` / `priority:low` |

種別ラベルはブランチ名の種別と一致させる。

---

## 5. ブランチの運用

### 5.1 命名規則

```
<種別>/<Issue番号>-<英小文字の要約>
```

| 種別 | 用途 |
| --- | --- |
| `feat` | 機能追加 |
| `fix` | バグ修正 |
| `docs` | 文書のみの変更 |
| `refactor` | 挙動を変えない内部改善 |
| `test` | テストの追加・修正 |
| `chore` | ビルド設定、依存関係、開発環境など |

例：

```
feat/12-card-create
fix/15-due-date-timezone
docs/18-add-api-spec
chore/4-setup-dev-workflow
```

要約部分は英小文字・数字・ハイフンのみを使う。日本語や大文字は使えない。この規則は GitHub Ruleset により次の正規表現で強制され、適合しないブランチは push できない。

```
^(feat|fix|docs|refactor|test|chore)/[0-9]+-[a-z0-9._-]+$
```

### 5.2 一つのブランチで扱う範囲

1 ブランチ = 1 Issue = 1 PR を原則とする。作業中に別の問題を見つけた場合は、そのブランチで直さず、新しい Issue を起票して別のブランチで対応する。

### 5.3 ブランチの寿命

マージされたブランチは GitHub 側の設定により自動削除される。ローカルに残った参照は次のコマンドで整理できる。

```bash
git switch main
git pull --ff-only
git fetch --prune
git branch --merged main | grep -v '^\*\|main' | xargs -r git branch -d
```

---

## 6. Pull Request の運用

### 6.1 記載事項

PR 本文は [.github/pull_request_template.md](../.github/pull_request_template.md) の項目に沿って記入する。

- **概要** — 何をしたのかを 1〜3 行で
- **関連 Issue** — `Closes #<番号>`。この記載によりマージ時に Issue が自動クローズされる
- **変更内容** — 変更したファイルと、その変更の意図
- **動作確認** — 実際に何を実行して確認したか
- **チェックリスト** — 文書の版数更新など、漏れやすい項目の確認

### 6.2 タイトル

squash マージすると PR のタイトルがそのまま `main` のコミットメッセージになる。したがってタイトルはコミットメッセージと同じ規約で書く。

```
<種別>: <日本語の要約>
```

### 6.3 レビューとマージ

現在はソロ開発のため、承認者は必須としていない（GitHub では自分の PR を自分で承認できないため、承認を必須にするとマージ不能になる）。ただし PR を経由すること自体は必須であり、マージ前に「Files changed」で差分を自分で確認する。

マージ方式は **squash のみ** を有効にしている。これにより `main` の履歴は「1 PR = 1 コミット」の直線になり、後から変更の単位を追いやすい。

---

## 7. main ブランチの保護

GitHub Ruleset により、`main` に対して次の制約をかけている。**例外の対象者（bypass）は設定していないため、リポジトリ管理者である本人にも同じ制約が適用される。**

| 制約 | 内容 |
| --- | --- |
| PR 必須 | 直接 push を拒否する。変更は PR 経由のみ |
| マージ方式 | squash のみ許可 |
| 必要な承認数 | 0 人 |
| force push 禁止 | 履歴の書き換えを拒否する |
| 削除禁止 | `main` ブランチ自体を削除できない |
| 直線履歴 | マージコミットを作らせない |

加えて、`main` 以外のすべてのブランチに対してブランチ名の正規表現を強制する Ruleset を設定している。

緊急時にどうしても一時的な解除が必要な場合は、GitHub のリポジトリ設定 → Rules → Rulesets から該当 Ruleset の Enforcement status を一時的に `Disabled` にする。**解除したまま放置しないこと。**

---

## 8. ローカルのフック

`.claude/hooks/guard-main-branch.sh` は Claude Code の PreToolUse フックとして動作し、シェルコマンドの実行前に内容を検査する。次の場合にコマンドを実行せず拒否する。

| 条件 | 判定 |
| --- | --- |
| 現在のブランチが `main` で `git commit` | 拒否 |
| 現在のブランチが `main` で `git push` | 拒否 |
| ブランチを問わず `git push ... origin main` | 拒否 |
| 現在のブランチが `main` で `git merge` | 拒否 |

設定は `.claude/settings.json` の `hooks.PreToolUse` にある。同ファイルの `permissions.deny` には、破壊的な操作（`rm`、`git reset --hard`、force push など）の拒否リストも定義されている。

このフックは Claude Code 経由のコマンドにのみ作用する。人が直接ターミナルで実行する場合は GitHub 側の Ruleset が最後の砦になる。
