package com.taskmanagement.backend;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 動作確認用のエンドポイント。
 * サーバーが起動して HTTP 要求に JSON で応答できることを確認する。
 */
@RestController
@RequestMapping("/api")
public class HealthController {

	@GetMapping("/health")
	public Map<String, String> health() {
		return Map.of("status", "ok");
	}

}
