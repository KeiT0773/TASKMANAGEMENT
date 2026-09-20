package com.taskmanagement.backend.card;

import static org.assertj.core.api.Assertions.assertThat;

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

}
