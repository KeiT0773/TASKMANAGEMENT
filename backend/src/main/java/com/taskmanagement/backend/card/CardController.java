package com.taskmanagement.backend.card;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * カードの API（API 設計書 6.〜9.）。
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

	/**
	 * POST /api/cards — カードを登録し、201 Created と登録したカードを返す。
	 * Location ヘッダーには登録したカードの URL（/api/cards/{id}）を入れる。
	 * {@code @Valid} により、body が CardCreateRequest の入力チェックに通らなければ
	 * このメソッドに入る前に 400 になる。
	 */
	@PostMapping
	public ResponseEntity<CardResponse> create(@Valid @RequestBody CardCreateRequest request) {
		Card card = cardService.create(request);
		URI location = URI.create("/api/cards/" + card.getId());
		return ResponseEntity.created(location).body(CardResponse.from(card));
	}

	/**
	 * PUT /api/cards/{id} — タイトル・説明文・期限・優先度を編集し、200 と編集後のカードを返す。
	 * 存在しなければ 404、入力チェックに通らなければ 400。
	 */
	@PutMapping("/{id}")
	public CardResponse update(@PathVariable("id") long id, @Valid @RequestBody CardUpdateRequest request) {
		return CardResponse.from(cardService.update(id, request));
	}

}
