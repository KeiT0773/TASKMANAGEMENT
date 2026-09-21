package com.taskmanagement.backend.card;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * カード編集 API の要求 body（API 設計書 9.）。
 * 4 項目をまとめて受け取り、編集できる項目を置き換える（PUT）。
 * listId と displayOrder は含めない（移動は CardMoveRequest / API 設計書 10.）。
 *
 * description と dueDate は null 可。description の空文字・空白のみは CardService が null にそろえる。
 * dueDate が日付として読めない文字列のときは Jackson の変換で失敗し、Spring が 400 を返す。
 */
public record CardUpdateRequest(
		@NotBlank(message = "タイトルは必須です")
		@Size(max = 100, message = "タイトルは100文字以内で入力してください")
		String title,

		@Size(max = 2000, message = "説明文は2000文字以内で入力してください")
		String description,

		LocalDate dueDate,

		@NotBlank(message = "優先度は必須です")
		@Pattern(regexp = "high|medium|low", message = "優先度は high / medium / low のいずれかで指定してください")
		String priority) {
}
