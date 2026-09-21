package com.taskmanagement.backend.list;

/**
 * 要求 body で指定された listId のリストが存在しないときに投げる例外。
 * パスではなく body の値の誤りなので、GlobalExceptionHandler は 404 ではなく
 * 400 の ProblemDetail に変換する（API 設計書 8.、決定事項 No.11）。
 */
public class BoardListNotFoundException extends RuntimeException {

	public BoardListNotFoundException(String listId) {
		super("リストが見つかりません: listId=" + listId);
	}

}
