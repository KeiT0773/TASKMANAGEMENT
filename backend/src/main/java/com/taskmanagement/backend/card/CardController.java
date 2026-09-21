package com.taskmanagement.backend.card;

import java.net.URI;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * カードの API（API 設計書 6.〜12.）。
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

	/**
	 * PUT /api/cards/{id}/position — カードを別のリストへ移動する、または同じリスト内で並べ替える。
	 * 200 と移動後のカードを返す。存在しなければ 404、listId が無ければ 400。
	 */
	@PutMapping("/{id}/position")
	public CardResponse move(@PathVariable("id") long id, @Valid @RequestBody CardMoveRequest request) {
		return CardResponse.from(cardService.move(id, request));
	}

	/**
	 * POST /api/cards/sort — すべてのリストのカードを優先度順に並べ直し、204 No Content を返す。
	 * 「並べ替える」は取得・作成・更新・削除のどれでもない操作なので、コレクションの下に動詞を置く形にしている
	 * （API 設計書 決定事項 No.17）。POST /api/cards（登録）とはパスが違うので衝突しない。
	 */
	@PostMapping("/sort")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void sort() {
		cardService.sortAllByPriority();
	}

	/**
	 * DELETE /api/cards/{id} — カードを削除し、204 No Content を返す。存在しなければ 404。
	 * 削除後はそのリストの displayOrder が詰められるため、フロントエンドは GET /api/cards?listId= で取り直す。
	 */
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable("id") long id) {
		cardService.delete(id);
	}

}
