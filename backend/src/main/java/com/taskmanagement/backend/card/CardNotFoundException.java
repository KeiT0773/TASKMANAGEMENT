package com.taskmanagement.backend.card;

/**
 * 指定した id のカードが存在しないときに投げる例外。
 * GlobalExceptionHandler が HTTP 404 の ProblemDetail に変換する（API 設計書 2.1）。
 */
public class CardNotFoundException extends RuntimeException {

	public CardNotFoundException(long id) {
		super("カードが見つかりません: id=" + id);
	}

}
