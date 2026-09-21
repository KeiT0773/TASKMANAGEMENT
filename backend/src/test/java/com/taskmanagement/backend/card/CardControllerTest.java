package com.taskmanagement.backend.card;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * カード API の統合テスト。
 * BackendApplicationTests と同様に実際の PostgreSQL へ接続するため、
 * 実行前に docker compose up -d が必要。
 * カードの件数は今後の操作で変わりうるため、件数そのものは検証しない。
 *
 * クラスに @Transactional を付けると、各テストは 1 つのトランザクションの中で実行され、
 * 終了時にロールバックされる。登録のテストが DB にカードを残さないようにするため。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CardControllerTest {

	@Autowired
	private MockMvcTester mvc;

	@Test
	void リスト一覧は3件をdisplayOrder順で返す() {
		assertThat(mvc.get().uri("/api/lists"))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.length()").isEqualTo(3);
					assertThat(json).extractingPath("$[0].id").isEqualTo("todo");
					assertThat(json).extractingPath("$[1].id").isEqualTo("doing");
					assertThat(json).extractingPath("$[2].id").isEqualTo("done");
				});
	}

	@Test
	void カード一覧はJSON配列を返す() {
		assertThat(mvc.get().uri("/api/cards"))
				.hasStatusOk()
				.bodyJson()
				.extractingPath("$")
				.asArray()
				.isNotEmpty();
	}

	@Test
	void カード一覧はlistIdで絞り込める() {
		assertThat(mvc.get().uri("/api/cards").param("listId", "todo"))
				.hasStatusOk()
				.bodyJson()
				.extractingPath("$[*].listId")
				.asArray()
				.isNotEmpty()
				.containsOnly("todo");
	}

	@Test
	void 存在しないリストで絞り込むと空配列を返す() {
		assertThat(mvc.get().uri("/api/cards").param("listId", "xxx"))
				.hasStatusOk()
				.bodyJson()
				.extractingPath("$")
				.asArray()
				.isEmpty();
	}

	@Test
	void カード1件は設計書どおりの項目を返す() {
		assertThat(mvc.get().uri("/api/cards/1"))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.id").isEqualTo(1);
					assertThat(json).extractingPath("$.title").asString().isNotBlank();
					assertThat(json).extractingPath("$.priority").asString().isIn("high", "medium", "low");
					assertThat(json).extractingPath("$.listId").asString().isIn("todo", "doing", "done");
					assertThat(json).extractingPath("$.createdAt").asString().isNotBlank();
					assertThat(json).extractingPath("$.updatedAt").asString().isNotBlank();
				});
	}

	@Test
	void 存在しないカードは404とProblemDetailを返す() {
		assertThat(mvc.get().uri("/api/cards/999999"))
				.hasStatus(HttpStatus.NOT_FOUND)
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.status").isEqualTo(404);
					assertThat(json).extractingPath("$.detail").asString().contains("999999");
					assertThat(json).extractingPath("$.instance").isEqualTo("/api/cards/999999");
				});
	}

	@Test
	void idが数値でなければ400を返す() {
		assertThat(mvc.get().uri("/api/cards/abc"))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.extractingPath("$.status")
				.isEqualTo(400);
	}

	// ---------- 登録（POST /api/cards、API 設計書 8.） ----------

	private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

	@Test
	void カードを登録すると201とLocationと登録したカードを返す() {
		assertThat(mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"  テスト用カード  \",\"priority\":\"low\",\"listId\":\"doing\"}"))
				.hasStatus(HttpStatus.CREATED)
				.satisfies(result -> {
					String location = result.getResponse().getHeader("Location");
					assertThat(location).matches("/api/cards/\\d+");
				})
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.id").asNumber().isNotNull();
					// 前後の空白は取り除いて保存される
					assertThat(json).extractingPath("$.title").isEqualTo("テスト用カード");
					assertThat(json).extractingPath("$.description").isNull();
					assertThat(json).extractingPath("$.dueDate").isNull();
					assertThat(json).extractingPath("$.priority").isEqualTo("low");
					assertThat(json).extractingPath("$.listId").isEqualTo("doing");
					assertThat(json).extractingPath("$.displayOrder").asNumber().satisfies(n -> assertThat(n.intValue()).isGreaterThanOrEqualTo(0));
					// 日時は UTC（末尾 Z）。登録直後は createdAt と updatedAt が同じ
					String createdAt = JsonPath.read(json.getJson(), "$.createdAt");
					assertThat(createdAt).endsWith("Z");
					assertThat(json).extractingPath("$.updatedAt").isEqualTo(createdAt);
				});
	}

	@Test
	void priorityを省略するとmediumになる() {
		assertThat(mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"優先度なし\",\"listId\":\"todo\"}"))
				.hasStatus(HttpStatus.CREATED)
				.bodyJson()
				.extractingPath("$.priority")
				.isEqualTo("medium");
	}

	@Test
	void 登録後はそのリストが優先度順に並び替えられdisplayOrderが振り直される() {
		// todo には初期データで high / medium / low が混在している。
		// high を追加すると、high グループの末尾（medium の直前）に入るはず。
		String createdTitle = "並べ替え確認";
		assertThat(mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"" + createdTitle + "\",\"priority\":\"high\",\"listId\":\"todo\"}"))
				.hasStatus(HttpStatus.CREATED);

		assertThat(mvc.get().uri("/api/cards").param("listId", "todo"))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					List<Integer> orders = JsonPath.read(json.getJson(), "$[*].displayOrder");
					List<String> priorities = JsonPath.read(json.getJson(), "$[*].priority");
					List<String> titles = JsonPath.read(json.getJson(), "$[*].title");

					// 0 からの連番
					for (int i = 0; i < orders.size(); i++) {
						assertThat(orders.get(i)).isEqualTo(i);
					}
					// 高 → 中 → 低 の順（優先度の順位が単調に増える）
					List<String> rank = List.of("high", "medium", "low");
					for (int i = 1; i < priorities.size(); i++) {
						assertThat(rank.indexOf(priorities.get(i))).isGreaterThanOrEqualTo(rank.indexOf(priorities.get(i - 1)));
					}
					// 登録したカードは high グループの末尾（次のカードがあれば high ではない）
					int idx = titles.indexOf(createdTitle);
					assertThat(idx).isGreaterThanOrEqualTo(0);
					assertThat(priorities.get(idx)).isEqualTo("high");
					if (idx + 1 < priorities.size()) {
						assertThat(priorities.get(idx + 1)).isNotEqualTo("high");
					}
				});
	}

	@Test
	void タイトルが空白だけなら400とerrorsを返す() {
		assertThat(mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"   \",\"listId\":\"todo\"}"))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.status").isEqualTo(400);
					assertThat(json).extractingPath("$.detail").isEqualTo("タイトルは必須です");
					assertThat(json).extractingPath("$.instance").isEqualTo("/api/cards");
					assertThat(json).extractingPath("$.errors[0].field").isEqualTo("title");
					assertThat(json).extractingPath("$.errors[0].message").isEqualTo("タイトルは必須です");
				});
	}

	@Test
	void タイトルが101文字なら400を返す() {
		String longTitle = "あ".repeat(101);
		assertThat(mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"" + longTitle + "\",\"listId\":\"todo\"}"))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.detail").asString().contains("100文字以内");
					assertThat(json).extractingPath("$.errors[0].field").isEqualTo("title");
				});
	}

	@Test
	void 複数の項目が不正なら項目名順にdetailへ連結される() {
		assertThat(mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"\",\"priority\":\"urgent\",\"listId\":\"todo\"}"))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.satisfies(json -> {
					// priority < title の順
					assertThat(json).extractingPath("$.detail")
							.isEqualTo("優先度は high / medium / low のいずれかで指定してください、タイトルは必須です");
					assertThat(json).extractingPath("$.errors[0].field").isEqualTo("priority");
					assertThat(json).extractingPath("$.errors[1].field").isEqualTo("title");
				});
	}

	@Test
	void 存在しないlistIdなら400を返す() {
		assertThat(mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"どこにも属さない\",\"listId\":\"xxx\"}"))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.status").isEqualTo(400);
					assertThat(json).extractingPath("$.detail").isEqualTo("リストが見つかりません: listId=xxx");
				});
	}

	@Test
	void bodyがJSONとして読めなければ400を返す() {
		assertThat(mvc.post().uri("/api/cards").contentType(JSON).content("{title:"))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.extractingPath("$.status")
				.isEqualTo(400);
	}

	// ---------- 編集（PUT /api/cards/{id}、API 設計書 9.） ----------

	/** テスト用にカードを登録し、その id を返す。@Transactional によりテスト後に消える。 */
	private long createCard(String title, String priority, String listId) {
		var result = mvc.post().uri("/api/cards").contentType(JSON)
				.content("{\"title\":\"" + title + "\",\"priority\":\"" + priority + "\",\"listId\":\"" + listId + "\"}")
				.exchange();
		assertThat(result).hasStatus(HttpStatus.CREATED);
		Number id = JsonPath.read(new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$.id");
		return id.longValue();
	}

	private static String updateBody(String title, String description, String dueDate, String priority) {
		return "{\"title\":" + jsonString(title) + ",\"description\":" + jsonString(description)
				+ ",\"dueDate\":" + jsonString(dueDate) + ",\"priority\":" + jsonString(priority) + "}";
	}

	private static String jsonString(String value) {
		return value == null ? "null" : "\"" + value + "\"";
	}

	@Test
	void カードを編集すると200と編集後のカードを返す() {
		long id = createCard("編集前", "medium", "doing");

		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("  編集後  ", "  ", "2026-10-01", "medium")))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.id").asNumber().satisfies(n -> assertThat(n.longValue()).isEqualTo(id));
					// タイトルは前後の空白を除いて保存、空白だけの説明文は null
					assertThat(json).extractingPath("$.title").isEqualTo("編集後");
					assertThat(json).extractingPath("$.description").isNull();
					assertThat(json).extractingPath("$.dueDate").isEqualTo("2026-10-01");
					assertThat(json).extractingPath("$.priority").isEqualTo("medium");
					assertThat(json).extractingPath("$.listId").isEqualTo("doing");
					String createdAt = JsonPath.read(json.getJson(), "$.createdAt");
					String updatedAt = JsonPath.read(json.getJson(), "$.updatedAt");
					assertThat(updatedAt).isGreaterThanOrEqualTo(createdAt);
				});
	}

	@Test
	void 説明文を入れ期限をnullにすると解除される() {
		long id = createCard("期限あり", "low", "done");
		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				// JSON 文字列の中の \n（改行）。Java のソース上は \\n と書く
				.content(updateBody("期限あり", "補足\\n2行目", "2026-10-01", "low")))
				.hasStatusOk()
				.bodyJson()
				.extractingPath("$.dueDate").isEqualTo("2026-10-01");

		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("期限あり", "補足\\n2行目", null, "low")))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.dueDate").isNull();
					// 改行を保ったまま保存されている
					assertThat(json).extractingPath("$.description").isEqualTo("補足\n2行目");
				});
	}

	@Test
	void 優先度を変えるとそのリストが並び替えられ変更後グループの末尾に入る() {
		// todo の初期データは high / medium / low。low で登録し、high に変えると high グループの末尾へ
		long id = createCard("優先度変更", "low", "todo");

		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("優先度変更", null, null, "high")))
				.hasStatusOk();

		assertThat(mvc.get().uri("/api/cards").param("listId", "todo"))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					List<Integer> orders = JsonPath.read(json.getJson(), "$[*].displayOrder");
					List<String> priorities = JsonPath.read(json.getJson(), "$[*].priority");
					List<Number> ids = JsonPath.read(json.getJson(), "$[*].id");

					for (int i = 0; i < orders.size(); i++) {
						assertThat(orders.get(i)).isEqualTo(i);
					}
					List<String> rank = List.of("high", "medium", "low");
					for (int i = 1; i < priorities.size(); i++) {
						assertThat(rank.indexOf(priorities.get(i))).isGreaterThanOrEqualTo(rank.indexOf(priorities.get(i - 1)));
					}
					int idx = -1;
					for (int i = 0; i < ids.size(); i++) {
						if (ids.get(i).longValue() == id) idx = i;
					}
					assertThat(idx).isGreaterThanOrEqualTo(0);
					assertThat(priorities.get(idx)).isEqualTo("high");
					if (idx + 1 < priorities.size()) {
						assertThat(priorities.get(idx + 1)).isNotEqualTo("high");
					}
				});
	}

	@Test
	void 優先度を変えなければ表示順は変わらない() {
		long id = createCard("位置固定", "high", "todo");
		Number before = JsonPath.read(
				new String(mvc.get().uri("/api/cards/" + id).exchange().getResponse().getContentAsByteArray(), StandardCharsets.UTF_8),
				"$.displayOrder");

		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("位置固定（改）", "説明を追加", null, "high")))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.title").isEqualTo("位置固定（改）");
					assertThat(json).extractingPath("$.displayOrder").asNumber()
							.satisfies(n -> assertThat(n.intValue()).isEqualTo(before.intValue()));
				});
	}

	@Test
	void 編集でタイトルが空白だけなら400を返す() {
		long id = createCard("空白編集", "medium", "todo");
		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("   ", null, null, "medium")))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.detail").isEqualTo("タイトルは必須です");
					assertThat(json).extractingPath("$.errors[0].field").isEqualTo("title");
				});
	}

	@Test
	void 編集で説明文が2001文字なら400を返す() {
		long id = createCard("長文", "medium", "todo");
		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("長文", "あ".repeat(2001), null, "medium")))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.detail").asString().contains("2000文字以内");
					assertThat(json).extractingPath("$.errors[0].field").isEqualTo("description");
				});
	}

	@Test
	void 編集で優先度が不正または未指定なら400を返す() {
		long id = createCard("優先度不正", "medium", "todo");
		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("優先度不正", null, null, "urgent")))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.extractingPath("$.errors[0].field").isEqualTo("priority");

		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("優先度不正", null, null, null)))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.extractingPath("$.detail").isEqualTo("優先度は必須です");
	}

	@Test
	void 編集で期限が日付として読めなければ400を返す() {
		long id = createCard("期限不正", "medium", "todo");
		assertThat(mvc.put().uri("/api/cards/" + id).contentType(JSON)
				.content(updateBody("期限不正", null, "2026/10/01", "medium")))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.extractingPath("$.status").isEqualTo(400);
	}

	@Test
	void 存在しないカードを編集すると404を返す() {
		assertThat(mvc.put().uri("/api/cards/999999").contentType(JSON)
				.content(updateBody("x", null, null, "medium")))
				.hasStatus(HttpStatus.NOT_FOUND)
				.bodyJson()
				.extractingPath("$.detail").asString().contains("999999");
	}

	// ---------- 移動・並べ替え（PUT /api/cards/{id}/position、API 設計書 10.） ----------

	private static String moveBody(String listId, Integer displayOrder) {
		return "{\"listId\":" + jsonString(listId) + ",\"displayOrder\":" + displayOrder + "}";
	}

	/** listId のカード一覧を取得し、id の並びを返す。あわせて displayOrder が 0 からの連番であることを検証する。 */
	private List<Long> idsInOrder(String listId) {
		String body = new String(mvc.get().uri("/api/cards").param("listId", listId).exchange()
				.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
		List<Integer> orders = JsonPath.read(body, "$[*].displayOrder");
		for (int i = 0; i < orders.size(); i++) {
			assertThat(orders.get(i)).as("displayOrder は 0 からの連番").isEqualTo(i);
		}
		List<Number> ids = JsonPath.read(body, "$[*].id");
		return ids.stream().map(Number::longValue).toList();
	}

	@Test
	void 同じリスト内で並べ替えると指定した位置に入り連番が維持される() {
		// low で登録すると done の末尾に A, B, C の順で並ぶ
		long a = createCard("並替A", "low", "done");
		long b = createCard("並替B", "low", "done");
		long c = createCard("並替C", "low", "done");
		List<Long> before = idsInOrder("done");
		int idxA = before.indexOf(a);
		assertThat(before.subList(idxA, idxA + 3)).containsExactly(a, b, c);

		// C を A の位置へ
		assertThat(mvc.put().uri("/api/cards/" + c + "/position").contentType(JSON)
				.content(moveBody("done", idxA)))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.listId").isEqualTo("done");
					assertThat(json).extractingPath("$.displayOrder").isEqualTo(idxA);
				});

		List<Long> after = idsInOrder("done");
		assertThat(after.subList(idxA, idxA + 3)).containsExactly(c, a, b);
		assertThat(after).hasSameSizeAs(before);
	}

	@Test
	void 別のリストへ移動すると両リストが振り直される() {
		long x = createCard("移動X", "low", "todo");
		int todoBefore = idsInOrder("todo").size();
		int doingBefore = idsInOrder("doing").size();

		assertThat(mvc.put().uri("/api/cards/" + x + "/position").contentType(JSON)
				.content(moveBody("doing", 0)))
				.hasStatusOk()
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.listId").isEqualTo("doing");
					assertThat(json).extractingPath("$.displayOrder").isEqualTo(0);
					String createdAt = JsonPath.read(json.getJson(), "$.createdAt");
					String updatedAt = JsonPath.read(json.getJson(), "$.updatedAt");
					assertThat(updatedAt).isGreaterThanOrEqualTo(createdAt);
				});

		List<Long> todoAfter = idsInOrder("todo");
		List<Long> doingAfter = idsInOrder("doing");
		assertThat(todoAfter).hasSize(todoBefore - 1).doesNotContain(x);
		assertThat(doingAfter).hasSize(doingBefore + 1);
		assertThat(doingAfter.get(0)).isEqualTo(x);
	}

	@Test
	void displayOrderが枚数以上なら末尾に置く() {
		long y = createCard("末尾Y", "high", "todo");

		assertThat(mvc.put().uri("/api/cards/" + y + "/position").contentType(JSON)
				.content(moveBody("done", 9999)))
				.hasStatusOk();

		List<Long> done = idsInOrder("done");
		assertThat(done.get(done.size() - 1)).isEqualTo(y);
	}

	@Test
	void 移動では優先度順に並べ直さない() {
		// todo の先頭は初期データの high。low のカードを先頭に置いてもそのまま先頭に残る
		long l = createCard("先頭へ", "low", "todo");

		assertThat(mvc.put().uri("/api/cards/" + l + "/position").contentType(JSON)
				.content(moveBody("todo", 0)))
				.hasStatusOk()
				.bodyJson()
				.extractingPath("$.displayOrder").isEqualTo(0);

		assertThat(idsInOrder("todo").get(0)).isEqualTo(l);
		assertThat(mvc.get().uri("/api/cards").param("listId", "todo"))
				.bodyJson()
				.extractingPath("$[0].priority").isEqualTo("low");
	}

	@Test
	void 移動でdisplayOrderが負なら400を返す() {
		long id = createCard("負の位置", "medium", "todo");
		assertThat(mvc.put().uri("/api/cards/" + id + "/position").contentType(JSON)
				.content(moveBody("todo", -1)))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.satisfies(json -> {
					assertThat(json).extractingPath("$.detail").isEqualTo("表示順は0以上で指定してください");
					assertThat(json).extractingPath("$.errors[0].field").isEqualTo("displayOrder");
				});
	}

	@Test
	void 移動先のlistIdが存在しなければ400を返す() {
		long id = createCard("行き先なし", "medium", "todo");
		assertThat(mvc.put().uri("/api/cards/" + id + "/position").contentType(JSON)
				.content(moveBody("xxx", 0)))
				.hasStatus(HttpStatus.BAD_REQUEST)
				.bodyJson()
				.extractingPath("$.detail").isEqualTo("リストが見つかりません: listId=xxx");
	}

	@Test
	void 存在しないカードを移動すると404を返す() {
		assertThat(mvc.put().uri("/api/cards/999999/position").contentType(JSON)
				.content(moveBody("todo", 0)))
				.hasStatus(HttpStatus.NOT_FOUND)
				.bodyJson()
				.extractingPath("$.detail").asString().contains("999999");
	}

}
