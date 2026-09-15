package com.taskmanagement.backend;

import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 動作確認用のエンドポイント。
 * サーバーが起動して HTTP 要求に JSON で応答できること、
 * およびデータベースに接続できることを確認する。
 */
@RestController
@RequestMapping("/api")
public class HealthController {

	private final JdbcTemplate jdbcTemplate;

	public HealthController(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@GetMapping("/health")
	public Map<String, String> health() {
		return Map.of("status", "ok");
	}

	/**
	 * データベースへの疎通確認。
	 * 実際に接続して問い合わせを行い、PostgreSQL が返したバージョンを返す。
	 * 接続できない場合は例外となり、HTTP 500 で応答する。
	 */
	@GetMapping("/health/db")
	public Map<String, String> healthDb() {
		String version = jdbcTemplate.queryForObject("select version()", String.class);
		return Map.of("status", "ok", "database", version);
	}

}
