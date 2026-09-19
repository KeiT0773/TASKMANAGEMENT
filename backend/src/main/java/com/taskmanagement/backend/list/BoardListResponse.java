package com.taskmanagement.backend.list;

/**
 * GET /api/lists の応答 1 件分（API 設計書 4.1）。
 * エンティティをそのまま返さず応答用の型を挟むことで、
 * テーブルの列構成と API の JSON 形式を独立して変更できるようにする。
 */
public record BoardListResponse(String id, String name, int displayOrder) {

	public static BoardListResponse from(BoardList list) {
		return new BoardListResponse(list.getId(), list.getName(), list.getDisplayOrder());
	}

}
