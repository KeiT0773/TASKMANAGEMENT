package com.taskmanagement.backend.card;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * cards テーブルに対応するエンティティ（データ設計書 4.2）。
 *
 * 型の対応：
 * - bigint（自動採番）→ Long。採番は DB が行うため IDENTITY を指定する
 * - date → LocalDate（時刻を持たない）
 * - timestamptz → OffsetDateTime（タイムゾーン付きの日時）
 * - priority は high / medium / low の文字列。列挙型への置き換えは更新 API の実装時に判断する
 *   （API 設計書 13. 保留事項）
 *
 * 値の変更は setter ではなく、操作の意味を表すメソッド（assignDisplayOrder など）を通して行う。
 * どこからでも任意の項目を書き換えられる状態を避けるため。
 */
@Entity
@Table(name = "cards")
public class Card {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id")
	private Long id;

	@Column(name = "title", nullable = false)
	private String title;

	@Column(name = "description")
	private String description;

	@Column(name = "due_date")
	private LocalDate dueDate;

	@Column(name = "priority", nullable = false)
	private String priority;

	@Column(name = "list_id", nullable = false)
	private String listId;

	@Column(name = "display_order", nullable = false)
	private int displayOrder;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	/** JPA がインスタンスを生成するために必要な引数なしコンストラクタ。 */
	protected Card() {
	}

	/**
	 * 新しいカードを作る（API 設計書 8.）。
	 * id は DB が採番するため null のまま。description と dueDate は登録時は未設定（null）。
	 * createdAt と updatedAt は同じ時刻にする（データ設計書 5.4）。
	 */
	public Card(String title, String priority, String listId, int displayOrder, OffsetDateTime now) {
		this.title = title;
		this.priority = priority;
		this.listId = listId;
		this.displayOrder = displayOrder;
		this.createdAt = now;
		this.updatedAt = now;
	}

	/**
	 * 編集できる 4 項目を置き換える（API 設計書 9.）。
	 * 呼び出し側（CardService）が title の前後の空白除去と、description の空文字 → null をそろえてから渡す。
	 * 値が変わっていなくても updatedAt は更新する（利用者が「保存した」操作の時刻を残す）。
	 */
	public void update(String title, String description, LocalDate dueDate, String priority, OffsetDateTime now) {
		this.title = title;
		this.description = description;
		this.dueDate = dueDate;
		this.priority = priority;
		this.updatedAt = now;
	}

	/**
	 * 別のリストへ移す（API 設計書 10.）。表示順は呼び出し側が assignDisplayOrder で振り直す。
	 * 同じリスト内の並べ替えではこのメソッドは呼ばない（listId が変わらないため）。
	 */
	public void moveTo(String listId, OffsetDateTime now) {
		this.listId = listId;
		this.updatedAt = now;
	}

	/**
	 * 並べ替えの結果として表示順を割り当てる（データ設計書 6.）。
	 * 値が変わるときだけ updatedAt も更新する。変わらないカードまで更新すると、
	 * 「並べ替えで動いていないのに更新日時だけ進む」ことになるため。
	 */
	public void assignDisplayOrder(int displayOrder, OffsetDateTime now) {
		if (this.displayOrder == displayOrder) {
			return;
		}
		this.displayOrder = displayOrder;
		this.updatedAt = now;
	}

	public Long getId() {
		return id;
	}

	public String getTitle() {
		return title;
	}

	public String getDescription() {
		return description;
	}

	public LocalDate getDueDate() {
		return dueDate;
	}

	public String getPriority() {
		return priority;
	}

	public String getListId() {
		return listId;
	}

	public int getDisplayOrder() {
		return displayOrder;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public OffsetDateTime getUpdatedAt() {
		return updatedAt;
	}

}
