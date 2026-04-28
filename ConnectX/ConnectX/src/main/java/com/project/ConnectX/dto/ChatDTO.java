package com.project.ConnectX.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatDTO {
    private Long userId;
    private String username;
    private String profilePicture;
    private String userStatus;
    private LocalDateTime lastSeen;
    private MessageDTO lastMessage;
    private Integer unreadCount;
}
