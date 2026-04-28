package com.project.ConnectX.websocket;

import com.project.ConnectX.entity.User;
import com.project.ConnectX.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messagingTemplate;
    private final UserRepository userRepository;
    private final Map<String, Long> sessionUserMap = new ConcurrentHashMap<>();

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = headerAccessor.getUser() != null ? headerAccessor.getUser().getName() : null;

        log.info("WebSocket connect event - Username: {}, Session: {}", username, headerAccessor.getSessionId());

        if (username != null) {
            userRepository.findByEmail(username).ifPresent(user -> {
                user.setUserStatus(User.UserStatus.ONLINE);
                user.setLastSeen(LocalDateTime.now());
                userRepository.save(user);

                String sessionId = headerAccessor.getSessionId();
                if (sessionId != null) {
                    sessionUserMap.put(sessionId, user.getId());
                }

                // Broadcast user online status
                Map<String, Object> statusMessage = new HashMap<>();
                statusMessage.put("userId", user.getId());
                statusMessage.put("username", user.getUsername());
                statusMessage.put("status", "ONLINE");
                statusMessage.put("lastSeen", user.getLastSeen().toString());

                messagingTemplate.convertAndSend("/topic/user-status", Optional.of(statusMessage));

                log.info("User {} is now ONLINE", user.getEmail());
            });
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        log.info("WebSocket disconnect event - Session: {}", sessionId);

        if (sessionId != null) {
            Long userId = sessionUserMap.remove(sessionId);

            if (userId != null) {
                userRepository.findById(userId).ifPresent(user -> {
                    user.setUserStatus(User.UserStatus.OFFLINE);
                    LocalDateTime lastSeen = LocalDateTime.now();
                    user.setLastSeen(lastSeen);
                    userRepository.save(user);

                    // Broadcast user offline status
                    Map<String, Object> statusMessage = new HashMap<>();
                    statusMessage.put("userId", user.getId());
                    statusMessage.put("username", user.getUsername());
                    statusMessage.put("status", "OFFLINE");
                    statusMessage.put("lastSeen", lastSeen.toString());

                    messagingTemplate.convertAndSend("/topic/user-status", Optional.of(statusMessage));

                    log.info("User {} is now OFFLINE", user.getEmail());
                });
            }
        }
    }
}