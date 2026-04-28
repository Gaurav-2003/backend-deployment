package com.project.ConnectX.controller;

import com.project.ConnectX.dto.AuthDTO;
import com.project.ConnectX.dto.ChatDTO;
import com.project.ConnectX.entity.User;
import com.project.ConnectX.repository.UserRepository;
import com.project.ConnectX.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<AuthDTO.UserResponse> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AuthDTO.UserResponse response = new AuthDTO.UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setProfilePicture(user.getProfilePicture());
        response.setStatus(user.getStatus());
        response.setUserStatus(user.getUserStatus().name());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<AuthDTO.UserResponse> updateProfile(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) MultipartFile profilePicture,
            Authentication authentication) throws IOException {

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AuthDTO.UserResponse response = userService.updateProfile(user.getId(), status, profilePicture);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<List<AuthDTO.UserResponse>> searchUsers(
            @RequestParam String query,
            Authentication authentication) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }

    @GetMapping("/chats")
    public ResponseEntity<List<ChatDTO>> getUserChats(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(userService.getUserChats(user.getId()));
    }
}