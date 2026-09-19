package com.taskmanagement.backend.list;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * リストの取得 API（API 設計書 5.）。
 * リストは 3 件固定で読み取りしかないため、Service 層を挟まず Repository を直接使う。
 */
@RestController
@RequestMapping("/api/lists")
public class BoardListController {

	private final BoardListRepository boardListRepository;

	public BoardListController(BoardListRepository boardListRepository) {
		this.boardListRepository = boardListRepository;
	}

	/** GET /api/lists — リスト一覧を displayOrder の昇順で返す。 */
	@GetMapping
	public List<BoardListResponse> list() {
		return boardListRepository.findAllByOrderByDisplayOrderAsc().stream()
				.map(BoardListResponse::from)
				.toList();
	}

}
