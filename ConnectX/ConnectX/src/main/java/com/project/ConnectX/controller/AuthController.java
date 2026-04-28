package com.project.ConnectX.controller;

import com.project.ConnectX.dto.AuthDTO;
import com.project.ConnectX.entity.OtpToken;
import com.project.ConnectX.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthDTO.RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(Map.of(
                "message", "OTP sent to your email",
                "email", request.getEmail()
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthDTO.AuthResponse> verifyOtp(@Valid @RequestBody AuthDTO.VerifyOtpRequest request) {
        AuthDTO.AuthResponse response = authService.verifyOtpAndLogin(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDTO.LoginRequest request) {
        authService.initiateLogin(request);
        return ResponseEntity.ok(Map.of(
                "message", "OTP sent to your email",
                "email", request.getEmail()
        ));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@Valid @RequestBody AuthDTO.ResendOtpRequest request) {
        OtpToken.OtpType type = OtpToken.OtpType.valueOf(request.getType().toUpperCase());
        authService.resendOtp(request.getEmail(), type);
        return ResponseEntity.ok(Map.of(
                "message", "New OTP sent to your email",
                "email", request.getEmail()
        ));
    }
}