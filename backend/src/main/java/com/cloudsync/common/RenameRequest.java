package com.cloudsync.common;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RenameRequest {
    @NotBlank
    @Size(max = 255)
    private String name;
}
