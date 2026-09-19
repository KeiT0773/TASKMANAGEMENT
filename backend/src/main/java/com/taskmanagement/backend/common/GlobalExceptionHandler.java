package com.taskmanagement.backend.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.taskmanagement.backend.card.CardNotFoundException;

/**
 * アプリ独自の例外を HTTP のエラー応答（RFC 9457 ProblemDetail）に変換する（API 設計書 2.1）。
 * Spring 自身が投げる例外（パスの型不一致など）は application.properties の
 * spring.mvc.problemdetails.enabled=true により、Spring が同じ形式で応答する。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(CardNotFoundException.class)
	public ProblemDetail handleCardNotFound(CardNotFoundException e) {
		// status と detail を設定すると、title と instance（要求のパス）は Spring が補う。
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

}
