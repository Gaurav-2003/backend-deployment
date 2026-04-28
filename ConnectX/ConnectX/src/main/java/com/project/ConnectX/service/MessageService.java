package com.project.ConnectX.service;

import com.project.ConnectX.dto.MessageDTO;
import com.project.ConnectX.entity.Message;
import com.project.ConnectX.entity.User;
import com.project.ConnectX.repository.MessageRepository;
import com.project.ConnectX.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    private final SentimentAnalysisService sentimentService;

    @Value("${file.upload.dir:./uploads}")
    private String uploadDir;

    @Transactional
    public MessageDTO sendMessage(Long senderId, Long recipientId, String content, Message.MessageType type) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new RuntimeException("Recipient not found"));

        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(content);
        message.setMessageType(type);
        message.setStatus(Message.MessageStatus.SENT);

        // Analyze sentiment for text messages
        if (type == Message.MessageType.TEXT && content != null && !content.isEmpty()) {
            Message.Sentiment sentiment = sentimentService.analyzeSentiment(content);
            message.setSentiment(sentiment);

            String detailedEmotionStr = sentimentService.getDetailedEmotion(content);
            try {
                Message.DetailedEmotion detailedEmotion = Message.DetailedEmotion.valueOf(detailedEmotionStr);
                message.setDetailedEmotion(detailedEmotion);
            } catch (IllegalArgumentException e) {
                message.setDetailedEmotion(Message.DetailedEmotion.NEUTRAL);
            }
        }

        Message savedMessage = messageRepository.save(message);
        MessageDTO messageDTO = MessageDTO.fromEntity(savedMessage);

        log.info("Message saved: {}", messageDTO);

        // Send via WebSocket to recipient
        messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/messages",
                messageDTO
        );

        log.info("Message sent to recipient via WebSocket: {}", recipient.getEmail());

        return messageDTO;
    }

    @Transactional
    public MessageDTO sendFileMessage(Long senderId, Long recipientId, MultipartFile file) throws IOException {
        log.info("Sending file from {} to {}: {}", senderId, recipientId, file.getOriginalFilename());

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path uploadPath = Paths.get(uploadDir);

        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            log.info("Created upload directory: {}", uploadPath);
        }

        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        log.info("File saved to: {}", filePath);

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new RuntimeException("Recipient not found"));

        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setMessageType(determineFileType(file.getContentType()));
        message.setFileUrl("/uploads/" + fileName);
        message.setFileName(file.getOriginalFilename());
        message.setFileSize(file.getSize());
        message.setStatus(Message.MessageStatus.SENT);

        Message savedMessage = messageRepository.save(message);
        MessageDTO messageDTO = MessageDTO.fromEntity(savedMessage);

        log.info("File message saved: {}", messageDTO);

        // Send via WebSocket to recipient
        messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/messages",
                messageDTO
        );

        log.info("File message sent to recipient via WebSocket");

        return messageDTO;
    }

    private Message.MessageType determineFileType(String contentType) {
        if (contentType == null) return Message.MessageType.FILE;

        if (contentType.startsWith("image/")) return Message.MessageType.IMAGE;
        if (contentType.startsWith("video/")) return Message.MessageType.VIDEO;
        if (contentType.startsWith("audio/")) return Message.MessageType.AUDIO;

        return Message.MessageType.FILE;
    }

    @Transactional
    public void markAsDelivered(Long messageId) {
        log.info("Marking message {} as delivered", messageId);
        messageRepository.findById(messageId).ifPresent(message -> {
            if (message.getStatus() == Message.MessageStatus.SENT) {
                message.setStatus(Message.MessageStatus.DELIVERED);
                message.setDeliveredAt(LocalDateTime.now());
                messageRepository.save(message);

                // Notify sender
                MessageDTO dto = MessageDTO.fromEntity(message);
                messagingTemplate.convertAndSendToUser(
                        message.getSender().getEmail(),
                        "/queue/message-status",
                        dto
                );

                log.info("Message {} marked as delivered", messageId);
            }
        });
    }

    @Transactional
    public void markAsRead(Long messageId) {
        log.info("Marking message {} as read", messageId);
        messageRepository.findById(messageId).ifPresent(message -> {
            message.setStatus(Message.MessageStatus.READ);
            message.setReadAt(LocalDateTime.now());
            if (message.getDeliveredAt() == null) {
                message.setDeliveredAt(LocalDateTime.now());
            }
            messageRepository.save(message);

            // Notify sender
            MessageDTO dto = MessageDTO.fromEntity(message);
            messagingTemplate.convertAndSendToUser(
                    message.getSender().getEmail(),
                    "/queue/message-status",
                    dto
            );

            log.info("Message {} marked as read", messageId);
        });
    }

    public Page<MessageDTO> getConversation(Long userId1, Long userId2, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findConversation(userId1, userId2, pageable);
        return messages.map(MessageDTO::fromEntity);
    }
}