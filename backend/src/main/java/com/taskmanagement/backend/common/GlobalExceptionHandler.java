package com.taskmanagement.backend.common;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.taskmanagement.backend.card.CardNotFoundException;
import com.taskmanagement.backend.list.BoardListNotFoundException;

/**
 * 例外を HTTP のエラー応答（RFC 9457 ProblemDetail）に変換する（API 設計書 2.1）。
 * ここで扱わない Spring 自身の例外（パスの型不一致、JSON が読めない、など）は
 * application.properties の spring.mvc.problemdetails.enabled=true により、Spring が同じ形式で応答する。
 *
 * Spring が用意するその ProblemDetail 用ハンドラーも MethodArgumentNotValidException を扱うため、
 * こちらが先に評価されるよう @Order で最優先にしている。
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {

	@ExceptionHandler(CardNotFoundException.class)
	public ProblemDetail handleCardNotFound(CardNotFoundException e) {
		// status と detail を設定すると、title と instance（要求のパス）は Spring が補う。
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

	/** body の listId が存在しない。パスではなく body の値の誤りなので 400（API 設計書 決定事項 No.11）。 */
	@ExceptionHandler(BoardListNotFoundException.class)
	public ProblemDetail handleBoardListNotFound(BoardListNotFoundException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

	/**
	 * 要求 body の入力チェック（@Valid）に通らなかった。
	 * detail には項目ごとのメッセージを「、」でつなぎ、拡張メンバー errors に内訳を付ける
	 * （API 設計書 2.1「入力チェックのエラー」）。
	 * 順序を安定させるため、項目名の順に並べる。
	 */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ProblemDetail handleValidation(MethodArgumentNotValidException e) {
		List<FieldError> fieldErrors = e.getBindingResult().getFieldErrors().stream()
				.sorted((a, b) -> a.getField().compareTo(b.getField()))
				.toList();

		String detail = fieldErrors.stream()
				.map(FieldError::getDefaultMessage)
				.collect(Collectors.joining("、"));

		List<Map<String, String>> errors = fieldErrors.stream()
				.map(fe -> Map.of("field", fe.getField(), "message", String.valueOf(fe.getDefaultMessage())))
				.toList();

		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
		problem.setProperty("errors", errors);
		return problem;
	}

}
