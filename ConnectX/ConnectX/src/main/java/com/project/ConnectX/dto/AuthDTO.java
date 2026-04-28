package com.project.ConnectX.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDTO {

    @Data
    public static class RegisterRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50)
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class VerifyOtpRequest {
        @NotBlank
        private String email;

        @NotBlank
        private String otp;
    }

    @Data
    public static class ResendOtpRequest {
        @NotBlank(message = "Email is required")
        @Email
        private String email;

        @NotBlank(message = "Type is required")
        private String type; // REGISTRATION or LOGIN
    }

    @Data
    public static class AuthResponse {
        private String token;
        private String type = "Bearer";
        private UserResponse user;
    }

    @Data
    public static class UserResponse {
        private Long id;
        private String username;
        private String email;
        private String profilePicture;
        private String status;
        private String userStatus;
    }
}