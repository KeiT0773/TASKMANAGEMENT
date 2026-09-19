-- リストの初期データ。3件で固定し、利用者は変更できない（docs/data-design.md 7.）。
-- 一度適用したこのファイルは編集しない（data-design.md 10.3）。

INSERT INTO lists (id, name, display_order) VALUES
    ('todo',  '未着手', 0),
    ('doing', '作業中', 1),
    ('done',  '完了',   2);
