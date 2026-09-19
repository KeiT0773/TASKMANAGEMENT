package com.taskmanagement.backend.card;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * cards テーブルへのアクセス。
 * Spring Data JPA がメソッド名から SQL を組み立てるため、実装クラスは書かない。
 * 並び順はデータ設計書 6.「取得時の並び」（ORDER BY list_id, display_order）に従う。
 */
public interface CardRepository extends JpaRepository<Card, Long> {

	/** 全件を list_id、display_order の昇順で返す。 */
	List<Card> findAllByOrderByListIdAscDisplayOrderAsc();

	/** 指定したリストのカードを display_order の昇順で返す。 */
	List<Card> findByListIdOrderByDisplayOrderAsc(String listId);

}
