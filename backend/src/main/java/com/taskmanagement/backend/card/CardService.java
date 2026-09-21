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
		OffsetDateTime now = now();

		// 現在の並び（displayOrder 昇順）を取り、新しいカードを末尾に置いてから優先度順に並べ直す。
		List<Card> cards = cardRepository.findByListIdOrderByDisplayOrderAsc(listId);
		Card card = new Card(title, priority, listId, cards.size(), now);
		cards.add(card);
		resortByPriority(cards, now);

		return cardRepository.save(card);
	}

	/**
	 * カードの 4 項目を編集する（API 設計書 9.「処理」）。
	 * 優先度が変わったときだけ、そのカードをリストの末尾に移してから優先度順に並べ直す（FR-08）。
	 * それ以外の項目の編集では並びに触らない。
	 */
	@Transactional
	public Card update(long id, CardUpdateRequest request) {
		Card card = findById(id);
		OffsetDateTime now = now();

		boolean priorityChanged = !card.getPriority().equals(request.priority());
		card.update(request.title().strip(), blankToNull(request.description()), request.dueDate(),
				request.priority(), now);

		if (priorityChanged) {
			// いったん並びから外して末尾に置き直す → 変更後の優先度グループの末尾に入る（機能要件書 3.1）
			List<Card> cards = cardRepository.findByListIdOrderByDisplayOrderAsc(card.getListId());
			cards.removeIf(c -> c.getId().equals(card.getId()));
			cards.add(card);
			resortByPriority(cards, now);
		}

		return card;
	}

	/**
	 * カードを別のリストへ移動する、または同じリスト内で並べ替える（API 設計書 10.「処理」）。
	 * 移動元・移動先のリストの displayOrder を 0 から振り直す。優先度順の並べ替えは行わず、
	 * 指定された位置にそのまま置く（FR-04、FR-05、機能要件書 3.1）。
	 */
	@Transactional
	public Card move(long id, CardMoveRequest request) {
		Card card = findById(id);
		String toListId = request.listId();
		if (!boardListRepository.existsById(toListId)) {
			throw new BoardListNotFoundException(toListId);
		}
		OffsetDateTime now = now();

		// 移動元の並びからカードを外す
		String fromListId = card.getListId();
		List<Card> source = cardRepository.findByListIdOrderByDisplayOrderAsc(fromListId);
		source.removeIf(c -> c.getId().equals(card.getId()));

		// 移動先の並び（同じリストなら外したあとの並び）の指定位置に差し込む。枚数以上なら末尾
		boolean sameList = fromListId.equals(toListId);
		List<Card> target = sameList ? source : cardRepository.findByListIdOrderByDisplayOrderAsc(toListId);
		int index = Math.min(request.displayOrder(), target.size());
		target.add(index, card);
		if (!sameList) {
			card.moveTo(toListId, now);
		}

		// 両リストを 0 からの通し番号に振り直す（データ設計書 6.「振り直しの単位」）
		renumber(target, now);
		if (!sameList) {
			renumber(source, now);
		}

		return card;
	}

	/** DB（timestamptz）の精度に合わせ、現在時刻をマイクロ秒に丸めて返す（API 設計書 2. 方針 5）。 */
	private static OffsetDateTime now() {
		return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
	}

	/** 空文字・空白のみを null にそろえる（データ設計書 2. 方針 4）。 */
	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}

	/**
	 * 1 つのリストのカードを 高 → 中 → 低 に並べ直し、displayOrder を 0 から振り直す（機能要件書 3.1、データ設計書 6.）。
	 * List.sort は安定ソート（同じ優先度どうしは元の順序を保つ）なので、操作したカードを末尾に置いてから呼べば
	 * 同じ優先度グループの末尾に入る。
	 * 既存のカードは JPA の管理下にあるため、値が変わったものはトランザクションの終了時に UPDATE される。
	 */
	private void resortByPriority(List<Card> cards, OffsetDateTime now) {
		cards.sort(Comparator.comparingInt(c -> PRIORITY_ORDER.indexOf(c.getPriority())));
		renumber(cards, now);
	}

	/** 並びのとおりに displayOrder を 0 からの通し番号にする。 */
	private void renumber(List<Card> cards, OffsetDateTime now) {
		for (int i = 0; i < cards.size(); i++) {
			cards.get(i).assignDisplayOrder(i, now);
		}
	}

}
