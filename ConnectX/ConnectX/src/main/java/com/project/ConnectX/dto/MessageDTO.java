package com.project.ConnectX.dto;

import com.project.ConnectX.entity.Message;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageDTO {

    private Long id;
    private Long senderId;
    private String senderUsername;
    private String senderProfilePicture;
    private Long recipientId;
    private String recipientUsername;
    private String content;
    private String messageType;
    private String status;
    private String sentiment;
    private String detailedEmotion; // New field
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private LocalDateTime timestamp;
    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;

    public static MessageDTO fromEntity(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setSenderId(message.getSender().getId());
        dto.setSenderUsername(message.getSender().getUsername());
        dto.setSenderProfilePicture(message.getSender().getProfilePicture());
        dto.setRecipientId(message.getRecipient().getId());
        dto.setRecipientUsername(message.getRecipient().getUsername());
        dto.setContent(message.getContent());
        dto.setMessageType(message.getMessageType().name());
        dto.setStatus(message.getStatus().name());
        dto.setSentiment(message.getSentiment() != null ? message.getSentiment().name() : null);
        dto.setDetailedEmotion(message.getDetailedEmotion() != null ? message.getDetailedEmotion().name() : null);
        dto.setFileUrl(message.getFileUrl());
        dto.setFileName(message.getFileName());
        dto.setFileSize(message.getFileSize());
        dto.setTimestamp(message.getTimestamp());
        dto.setDeliveredAt(message.getDeliveredAt());
        dto.setReadAt(message.getReadAt());
        return dto;
    }
}