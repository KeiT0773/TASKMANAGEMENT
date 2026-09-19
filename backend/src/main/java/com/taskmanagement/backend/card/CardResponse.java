package com.taskmanagement.backend.card;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * カード API の応答 1 件分（API 設計書 4.2）。
 * 項目名はそのまま JSON のキー（camelCase）になる。
 * 値が無い項目（description, dueDate）は null のまま返し、省略しない（API 設計書 2. 方針 6）。
 */
public record CardResponse(
		Long id,
		String title,
		String description,
		LocalDate dueDate,
		String priority,
		String listId,
		int displayOrder,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt) {

	public static CardResponse from(Card card) {
		return new CardResponse(
				card.getId(),
				card.getTitle(),
				card.getDescription(),
				card.getDueDate(),
				card.getPriority(),
				card.getListId(),
				card.getDisplayOrder(),
				card.getCreatedAt(),
				card.getUpdatedAt());
	}

}
