package com.taskmanagement.backend.list;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * lists テーブルへのアクセス。
 * Spring Data JPA がメソッド名から SQL を組み立てるため、実装クラスは書かない。
 */
public interface BoardListRepository extends JpaRepository<BoardList, String> {

	/** ボード上の並び順（display_order の昇順）で全件を返す。 */
	List<BoardList> findAllByOrderByDisplayOrderAsc();

}
