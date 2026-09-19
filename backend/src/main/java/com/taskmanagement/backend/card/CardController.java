package com.taskmanagement.backend.card;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * カードの取得 API（API 設計書 6.・7.）。
 * HTTP の要求・応答の変換だけを担当し、処理は CardService に委ねる。
 */
@RestController
@RequestMapping("/api/cards")
public class CardController {

	private final CardService cardService;

	public CardController(CardService cardService) {
		this.cardService = cardService;
	}

	/**
	 * GET /api/cards — カード一覧を listId、displayOrder の昇順で返す。
	 * ?listId=todo のように指定すると、そのリストのカードだけを返す。
	 */
	@GetMapping
	public List<CardResponse> list(@RequestParam(name = "listId", required = false) String listId) {
		return cardService.findAll(listId).stream()
				.map(CardResponse::from)
				.toList();
	}

	/** GET /api/cards/{id} — カードを 1 件返す。存在しなければ 404。 */
	@GetMapping("/{id}")
	public CardResponse get(@PathVariable("id") long id) {
		return CardResponse.from(cardService.findById(id));
	}

}
