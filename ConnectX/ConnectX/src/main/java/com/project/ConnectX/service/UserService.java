package com.project.ConnectX.service;

import com.project.ConnectX.dto.AuthDTO;
import com.project.ConnectX.dto.ChatDTO;
import com.project.ConnectX.dto.MessageDTO;
import com.project.ConnectX.entity.Message;
import com.project.ConnectX.entity.User;
import com.project.ConnectX.repository.MessageRepository;
import com.project.ConnectX.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    private static final String UPLOAD_DIR = "./uploads/profiles/";

    public AuthDTO.UserResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToUserResponse(user);
    }

    @Transactional
    public AuthDTO.UserResponse updateProfile(Long userId, String status, MultipartFile profilePicture) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (status != null) {
            user.setStatus(status);
        }

        if (profilePicture != null && !profilePicture.isEmpty()) {
            String fileName = UUID.randomUUID() + "_" + profilePicture.getOriginalFilename();
            Path uploadPath = Paths.get(UPLOAD_DIR);

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path filePath = uploadPath.resolve(fileName);
            Files.copy(profilePicture.getInputStream(), filePath);

            user.setProfilePicture("/uploads/profiles/" + fileName);
        }

        User savedUser = userRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    public List<AuthDTO.UserResponse> searchUsers(String query) {
        return userRepository.searchUsers(query).stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    public List<ChatDTO> getUserChats(Long userId) {
        List<User> chatPartners = messageRepository.findChatPartners(userId);

        return chatPartners.stream().map(partner -> {
            ChatDTO chatDTO = new ChatDTO();
            chatDTO.setUserId(partner.getId());
            chatDTO.setUsername(partner.getUsername());
            chatDTO.setProfilePicture(partner.getProfilePicture());
            chatDTO.setUserStatus(partner.getUserStatus().name());
            chatDTO.setLastSeen(partner.getLastSeen());

            // Get last message
            messageRepository.findConversation(userId, partner.getId(),
                            org.springframework.data.domain.PageRequest.of(0, 1))
                    .stream().findFirst()
                    .ifPresent(msg -> chatDTO.setLastMessage(MessageDTO.fromEntity(msg)));

            // Get unread count
            Integer unreadCount = messageRepository.countUnreadMessages(userId, partner.getId());
            chatDTO.setUnreadCount(unreadCount);

            return chatDTO;
        }).collect(Collectors.toList());
    }

    private AuthDTO.UserResponse mapToUserResponse(User user) {
        AuthDTO.UserResponse response = new AuthDTO.UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setProfilePicture(user.getProfilePicture());
        response.setStatus(user.getStatus());
        response.setUserStatus(user.getUserStatus().name());
        return response;
    }
}
