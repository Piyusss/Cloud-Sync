package com.cloudvault.search;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<List<SearchResultDto>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @AuthenticationPrincipal UUID userId) {

        LocalDate fromDate = (from != null && !from.isBlank()) ? LocalDate.parse(from) : null;
        LocalDate toDate   = (to   != null && !to.isBlank())   ? LocalDate.parse(to)   : null;

        return ResponseEntity.ok(searchService.search(userId, q, type, fromDate, toDate));
    }
}
