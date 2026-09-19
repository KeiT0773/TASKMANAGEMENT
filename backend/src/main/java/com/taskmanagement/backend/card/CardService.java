package com.taskmanagement.backend.card;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * カードに関する業務処理。
 * 取得だけの現段階では薄い層だが、登録・移動・並べ替え（表示順の振り直しを
 * 1 つのトランザクションで行う処理）はここに置く前提で、最初から層を分けておく。
 */
@Service
@Transactional(readOnly = true)
public class CardService {

	private final CardRepository cardRepository;

	public CardService(CardRepository cardRepository) {
		this.cardRepository = cardRepository;
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

}
