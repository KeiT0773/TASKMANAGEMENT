package com.taskmanagement.backend.card;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * カード移動・並べ替え API の要求 body（API 設計書 10.）。
 * 別のリストへの移動（FR-04）も同じリスト内の並べ替え（FR-05）も、
 * 「移動先のリスト」と「その中での位置」で表す。
 *
 * displayOrder は「移動先のリストで、自分を除いた並びの何番目に入るか」（0 始まり）。
 * ドラッグ&ドロップのライブラリが返す移動先の index と同じ定義。
 */
public record CardMoveRequest(
		@NotBlank(message = "リストは必須です")
		String listId,

		@NotNull(message = "表示順は必須です")
		@Min(value = 0, message = "表示順は0以上で指定してください")
		Integer displayOrder) {
}
