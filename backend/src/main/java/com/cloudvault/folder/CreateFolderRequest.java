package com.cloudvault.folder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateFolderRequest {

    @NotBlank(message = "Folder name is required")
    @Size(max = 255, message = "Folder name must be 255 characters or less")
    private String name;

    private UUID parentFolderId;
}
