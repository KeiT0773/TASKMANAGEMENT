package com.taskmanagement.backend.list;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * lists テーブルに対応するエンティティ（データ設計書 4.1）。
 * 「リスト」をそのまま List と名付けると java.util.List と紛らわしいため、
 * BoardList（ボード上の列）とする（データ設計書 12.）。
 *
 * テーブルの作成・変更は Flyway だけが行うため、ここでは列の対応づけのみを宣言する。
 */
@Entity
@Table(name = "lists")
public class BoardList {

	@Id
	@Column(name = "id")
	private String id;

	@Column(name = "name", nullable = false)
	private String name;

	@Column(name = "display_order", nullable = false)
	private int displayOrder;

	/** JPA がインスタンスを生成するために必要な引数なしコンストラクタ。 */
	protected BoardList() {
	}

	public String getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public int getDisplayOrder() {
		return displayOrder;
	}

}
