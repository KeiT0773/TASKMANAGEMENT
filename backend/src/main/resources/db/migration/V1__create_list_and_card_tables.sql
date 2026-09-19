-- リスト（列）と カード のテーブルを作成する。
-- 定義の根拠は docs/data-design.md 4.〜5. を参照。
-- 一度適用したこのファイルは編集しない（data-design.md 10.3）。

CREATE TABLE lists (
    id            varchar(10) NOT NULL,
    name          varchar(20) NOT NULL,
    display_order smallint    NOT NULL,
    CONSTRAINT pk_lists PRIMARY KEY (id)
);

COMMENT ON TABLE  lists               IS 'リスト（列）。未着手 / 作業中 / 完了 の3件で固定';
COMMENT ON COLUMN lists.id            IS '識別子。todo / doing / done';
COMMENT ON COLUMN lists.name          IS '画面に表示する列の名称';
COMMENT ON COLUMN lists.display_order IS 'ボード上での並び順。左から 0, 1, 2';

CREATE TABLE cards (
    id            bigint        NOT NULL GENERATED ALWAYS AS IDENTITY,
    title         varchar(100)  NOT NULL,
    description   varchar(2000),
    due_date      date,
    priority      varchar(6)    NOT NULL DEFAULT 'medium',
    list_id       varchar(10)   NOT NULL,
    display_order integer       NOT NULL,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_cards            PRIMARY KEY (id),
    CONSTRAINT fk_cards_list       FOREIGN KEY (list_id) REFERENCES lists (id)
                                       ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_cards_title      CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_cards_priority   CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT ck_cards_disp_order CHECK (display_order >= 0)
);

CREATE INDEX ix_cards_list_display_order ON cards (list_id, display_order);

COMMENT ON TABLE  cards               IS 'カード。利用者が登録するタスク1件';
COMMENT ON COLUMN cards.title         IS 'タスク名。空文字・空白のみは不可（FR-01）';
COMMENT ON COLUMN cards.description   IS '補足説明。未入力は NULL（FR-06）';
COMMENT ON COLUMN cards.due_date      IS '期限。未設定は NULL（FR-07）';
COMMENT ON COLUMN cards.priority      IS '優先度。high / medium / low（FR-08）';
COMMENT ON COLUMN cards.list_id       IS '所属リスト。lists.id を参照（FR-04）';
COMMENT ON COLUMN cards.display_order IS 'リスト内での表示順。0 から始まる通し番号（FR-05）';
