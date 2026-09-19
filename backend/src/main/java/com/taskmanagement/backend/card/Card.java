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
 * - priority は high / medium / low の文字列。列挙型への置き換えは登録 API の実装時に検討する
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
