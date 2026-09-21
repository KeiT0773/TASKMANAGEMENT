package com.taskmanagement.backend.card;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taskmanagement.backend.list.BoardListNotFoundException;
import com.taskmanagement.backend.list.BoardListRepository;

/**
 * カードに関する業務処理。
 * 登録・移動・並べ替え（表示順の振り直しを 1 つのトランザクションで行う処理）はここに置く。
 * Controller は HTTP の変換だけを担当し、Repository は SQL の実行だけを担当する。
 */
@Service
@Transactional(readOnly = true)
public class CardService {

	/** 優先度順の並べ替えで使う順序（機能要件書 3.1）。先頭ほど上に表示する。 */
	private static final List<String> PRIORITY_ORDER = List.of("high", "medium", "low");

	/** 要求で priority が省略されたときの既定値（API 設計書 8.）。 */
	private static final String DEFAULT_PRIORITY = "medium";

	private final CardRepository cardRepository;
	private final BoardListRepository boardListRepository;

	public CardService(CardRepository cardRepository, BoardListRepository boardListRepository) {
		this.cardRepository = cardRepository;
		this.boardListRepository = boardListRepository;
	}

	/**
	 * カード一覧を返す。
	 * @param listId 絞り込むリストの id。null なら全件
	 */
	public List<Card> findAll(String listId) {
		if (listId == null) {
			return cardRepository.findAllByOrderByListIdAscDisplayOrderAsc();
		}
		return cardRepository.findByListIdOrderByDisplayOrderAsc(listId);
	}

	/** id で 1 件を返す。存在しなければ CardNotFoundException。 */
	public Card findById(long id) {
		return cardRepository.findById(id)
				.orElseThrow(() -> new CardNotFoundException(id));
	}

	/**
	 * カードを登録し、そのリスト内を優先度順に並べ直す（API 設計書 8.「処理」）。
	 *
	 * クラスの readOnly = true をこのメソッドだけ上書きし、書き込み可能なトランザクションにする。
	 * 途中で例外が出れば、追加した行も既存カードの表示順の更新もまとめて取り消される。
	 */
	@Transactional
	public Card create(CardCreateRequest request) {
		String listId = request.listId();
		if (!boardListRepository.existsById(listId)) {
			throw new BoardListNotFoundException(listId);
		}

		String title = request.title().strip();
		String priority = request.priority() != null ? request.priority() : DEFAULT_PRIORITY;
		// DB（timestamptz）の精度はマイクロ秒。Java の現在時刻はそれより細かいことがあるため、
		// 保存前に丸めて、登録の応答と後で取得した値が一致するようにする（API 設計書 2. 方針 5）。
		OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);

		// 現在の並び（displayOrder 昇順）を取り、新しいカードをいったん末尾に置く。
		List<Card> cards = cardRepository.findByListIdOrderByDisplayOrderAsc(listId);
		Card card = new Card(title, priority, listId, cards.size(), now);
		cards.add(card);

		// 高 → 中 → 低 に並べ直す。List.sort は安定ソート（同じ優先度どうしは元の順序を保つ）なので、
		// 末尾に置いてから並べ替えれば、新しいカードは同じ優先度グループの末尾に入る（機能要件書 3.1）。
		cards.sort(Comparator.comparingInt(c -> PRIORITY_ORDER.indexOf(c.getPriority())));

		// 0 からの通し番号に振り直す（データ設計書 6.）。
		// 既存のカードは JPA の管理下にあるため、値が変わったものはトランザクションの終了時に UPDATE される。
		for (int i = 0; i < cards.size(); i++) {
			cards.get(i).assignDisplayOrder(i, now);
		}

		return cardRepository.save(card);
	}

}
