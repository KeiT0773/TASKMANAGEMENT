package com.taskmanagement.backend.card;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * 取得 API の統合テスト。
 * BackendApplicationTests と同様に実際の PostgreSQL へ接続するため、
 * 実行前に docker compose up -d が必要。
 * カードの件数は今後の操作で変わりうるため、件数そのものは検証しない。
 */
@SpringBootTest
@AutoConfigureMockMvc
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

}
