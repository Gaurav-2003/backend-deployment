package com.project.ConnectX.controller;

import com.project.ConnectX.dto.MessageDTO;
import com.project.ConnectX.entity.Message;
import com.project.ConnectX.entity.User;
import com.project.ConnectX.repository.UserRepository;
import com.project.ConnectX.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class MessageController {

    private final MessageService messageService;
    private final SimpMessageSendingOperations messagingTemplate;
    private final UserRepository userRepository;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload Map<String, Object> messagePayload, Principal principal) {
        try {
            log.info("Received message from WebSocket: {}", messagePayload);
            log.info("Principal: {}", principal != null ? principal.getName() : "NULL");

            Long senderId = Long.valueOf(messagePayload.get("senderId").toString());
            Long recipientId = Long.valueOf(messagePayload.get("recipientId").toString());
            String content = messagePayload.get("content").toString();

            log.info("Sending message - Sender: {}, Recipient: {}, Content: {}", senderId, recipientId, content);

            MessageDTO messageDTO = messageService.sendMessage(senderId, recipientId, content, Message.MessageType.TEXT);

            log.info("Message sent successfully: {}", messageDTO);

            // Also send to sender for confirmation
            User sender = userRepository.findById(senderId).orElseThrow();
            messagingTemplate.convertAndSendToUser(
                    sender.getEmail(),
                    "/queue/messages",
                    messageDTO
            );

        } catch (Exception e) {
            log.error("Error sending message via WebSocket", e);
        }
    }

    @MessageMapping("/chat.typing")
    public void userTyping(@Payload Map<String, Object> payload, Principal principal) {
        try {
            log.info("Typing indicator received: {}", payload);
            String recipientEmail = payload.get("recipientEmail").toString();
            messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/typing", payload);
        } catch (Exception e) {
            log.error("Error sending typing indicator", e);
        }
    }

    @MessageMapping("/message.delivered")
    public void markDelivered(@Payload Long messageId) {
        try {
            log.info("Marking message as delivered: {}", messageId);
            messageService.markAsDelivered(messageId);
        } catch (Exception e) {
            log.error("Error marking message as delivered", e);
        }
    }

    @MessageMapping("/message.read")
    public void markRead(@Payload Long messageId) {
        try {
            log.info("Marking message as read: {}", messageId);
            messageService.markAsRead(messageId);
        } catch (Exception e) {
            log.error("Error marking message as read", e);
        }
    }

    @PostMapping("/api/messages/file")
    public ResponseEntity<MessageDTO> sendFile(
            @RequestParam Long recipientId,
            @RequestParam MultipartFile file,
            Authentication authentication) throws IOException {

        try {
            log.info("File upload request - Recipient: {}, File: {}", recipientId, file.getOriginalFilename());

            String email = authentication.getName();
            User sender = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            MessageDTO message = messageService.sendFileMessage(sender.getId(), recipientId, file);
            log.info("File sent successfully: {}", message);

            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Error sending file", e);
            throw e;
        }
    }

    @GetMapping("/api/messages/conversation")
    public ResponseEntity<Page<MessageDTO>> getConversation(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Authentication authentication) {

        try {
            log.info("Loading conversation - userId: {}, page: {}, size: {}", userId, page, size);

            String email = authentication.getName();
            User currentUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Page<MessageDTO> messages = messageService.getConversation(currentUser.getId(), userId, page, size);
            log.info("Loaded {} messages", messages.getContent().size());

            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error loading conversation", e);
            throw e;
        }
    }

    // Test endpoint to check if REST API is working
    @GetMapping("/api/messages/test")
    public ResponseEntity<?> testEndpoint(Authentication authentication) {
        return ResponseEntity.ok(Map.of(
                "message", "Messages API is working",
                "user", authentication.getName()
        ));
    }
}