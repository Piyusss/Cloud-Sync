package com.cloudsync.analytics;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypeBreakdownDto {
    private String typeLabel;
    private long count;
    private long totalSize;
}
