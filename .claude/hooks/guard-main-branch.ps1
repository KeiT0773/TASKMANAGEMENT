# main ブランチを保護する PreToolUse フック
#
# Claude Code がシェルコマンドを実行する直前に呼ばれ、標準入力から受け取った
# JSON の tool_input.command を検査する。開発フローに反するコマンドだった場合は
# 終了コード 2 を返してコマンドの実行そのものを中止させる。
#
# 判定内容はリポジトリの docs/development-workflow.md 「8. ローカルのフック」を参照。

$ErrorActionPreference = 'Stop'

function Approve {
    exit 0
}

function Deny([string]$reason) {
    $message = @"
[開発フロー違反] $reason

このリポジトリでは main ブランチを直接変更できません。次の手順で進めてください。

  1. Issue を起票する
     gh issue create

  2. main を最新にしてからブランチを切る
     git switch main
     git pull --ff-only
     git switch -c <種別>/<Issue番号>-<要約>
     （種別は feat / fix / docs / refactor / test / chore）

  3. コミットして push する
     git push -u origin <ブランチ名>

  4. PR を作る（本文に Closes #<Issue番号> を書く）
     gh pr create

main への直接 push は GitHub の Ruleset でも拒否されるため、このフックを
回避しても反映はできません。詳細は docs/development-workflow.md を参照。
"@
    [Console]::Error.WriteLine($message)
    exit 2
}

# --- 標準入力の JSON を読む -------------------------------------------------

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { Approve }
    $payload = $raw | ConvertFrom-Json
} catch {
    # 入力を解釈できないときは判定を諦めて通す（誤ってブロックしないため）
    Approve
}

$command = $null
if ($payload.PSObject.Properties.Name -contains 'tool_input' -and $payload.tool_input) {
    $command = $payload.tool_input.command
}
if ([string]::IsNullOrWhiteSpace($command)) { Approve }

# --- 現在のブランチを調べる -------------------------------------------------

$repoDir = $payload.cwd
if ([string]::IsNullOrWhiteSpace($repoDir) -or -not (Test-Path $repoDir)) {
    $repoDir = (Get-Location).Path
}

$currentBranch = ''
try {
    $currentBranch = (& git -C $repoDir rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
} catch {
    # git リポジトリでない、git が無いなどの場合は通す
    Approve
}
if ([string]::IsNullOrWhiteSpace($currentBranch)) { Approve }

$onMain = ($currentBranch -eq 'main')

# --- コマンドを区切り単位に分解して git のサブコマンドを取り出す ------------

function Get-GitSubcommand([string]$segment) {
    $text = $segment.Trim()
    if ($text -notmatch '^git(\.exe)?(\s|$)') { return $null }

    $tokens = @($text -split '\s+' | Where-Object { $_ -ne '' })
    $i = 1
    while ($i -lt $tokens.Count) {
        $token = $tokens[$i]
        if ($token.StartsWith('-')) {
            # 値を伴うグローバルオプションは次のトークンごと読み飛ばす
            if ($token -eq '-C' -or $token -eq '-c' -or $token -eq '--git-dir' -or $token -eq '--work-tree') {
                $i += 2
            } else {
                $i += 1
            }
            continue
        }
        return $token
    }
    return $null
}

$segments = @($command -split '(?:&&|\|\||;|\r?\n|\|)')

$subcommands = @()
$switchesToMain = $false

foreach ($segment in $segments) {
    $sub = Get-GitSubcommand $segment
    if ($null -eq $sub) { continue }
    $subcommands += [pscustomobject]@{ Name = $sub; Text = $segment.Trim() }

    if (($sub -eq 'switch' -or $sub -eq 'checkout') -and $segment -match '(^|\s)main(\s|$)') {
        $switchesToMain = $true
    }
}

if ($subcommands.Count -eq 0) { Approve }

# --- 判定 -------------------------------------------------------------------

foreach ($entry in $subcommands) {
    $name = $entry.Name
    $text = $entry.Text

    # ブランチに関係なく、main を push 先に名指しするものは拒否
    if ($name -eq 'push' -and $text -match '\bmain\b') {
        Deny "main ブランチへの直接 push は禁止されています。（$text）"
    }

    if ($name -eq 'push' -and $onMain) {
        Deny "現在 main ブランチにいます。main から push することはできません。（$text）"
    }

    if ($name -eq 'commit' -and ($onMain -or $switchesToMain)) {
        Deny "main ブランチ上でコミットすることはできません。（$text）"
    }

    if ($name -eq 'merge' -and $onMain) {
        Deny "main へのローカル merge は禁止されています。マージは GitHub 上の Pull Request で行ってください。（$text）"
    }
}

Approve
