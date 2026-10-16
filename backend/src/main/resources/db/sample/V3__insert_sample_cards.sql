-- 開発中の動作確認用サンプルカード。画面モック（mock/script.js）と同じ 6 件。
-- 期限は適用日を基準にした相対日付とし、期限切れの例（買い物・返信）が含まれるようにする。
-- id は GENERATED ALWAYS のため指定しない。display_order はリストごとに 0 から振る。
-- 一度適用したこのファイルは編集しない（docs/data-design.md 10.3）。

INSERT INTO cards (title, description, due_date, priority, list_id, display_order) VALUES
    ('資料作成', E'来週の定例会議で使う資料。\n前回の議事録を参照すること。', current_date + 2, 'high',   'todo',  0),
    ('買い物',   '牛乳、卵、パン',                                       current_date - 3, 'medium', 'todo',  1),
    ('読書',     NULL,                                                   NULL,             'low',    'todo',  2),
    ('実装',     'ログイン画面のバリデーションを追加する',                current_date + 7, 'medium', 'doing', 0),
    ('掃除',     NULL,                                                   NULL,             'low',    'done',  0),
    ('返信',     '田中さんへのメール返信',                                current_date - 2, 'medium', 'done',  1);
