package com.project.ConnectX.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserStatusDTO {
    private Long userId;
    private String username;
    private String status;
    private LocalDateTime lastSeen;

    public UserStatusDTO(Long userId, String username, String status) {
        this.userId = userId;
        this.username = username;
        this.status = status;
    }
}
