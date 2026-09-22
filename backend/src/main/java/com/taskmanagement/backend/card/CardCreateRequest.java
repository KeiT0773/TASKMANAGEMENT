package com.taskmanagement.backend.card;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * カード登録 API の要求 body（API 設計書 8.）。
 * 入力チェックは各項目の注釈で行い、違反があれば Spring が MethodArgumentNotValidException を投げ、
 * GlobalExceptionHandler が 400 の ProblemDetail に変換する（API 設計書 2.1）。
 *
 * description と dueDate は登録時には受け取らない（FR-01）。body に含まれていても無視される。
 *
 * title は「前後の空白を除いて 1 文字以上、100 文字以内」（API 設計書 8.）。
 * コンパクトコンストラクタで先に空白を除いておき、@NotBlank と @Size が除いた後の値に掛かるようにする。
 */
public record CardCreateRequest(
		@NotBlank(message = "タイトルは必須です")
		@Size(max = 100, message = "タイトルは100文字以内で入力してください")
		String title,

		// null 可。null のときは CardService が medium を補う
		@Pattern(regexp = "high|medium|low", message = "優先度は high / medium / low のいずれかで指定してください")
		String priority,

		@NotBlank(message = "リストは必須です")
		String listId) {

	public CardCreateRequest {
		title = title == null ? null : title.strip();
	}

}
