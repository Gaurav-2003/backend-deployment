package com.project.ConnectX.service;

import com.project.ConnectX.dto.AuthDTO;
import com.project.ConnectX.entity.OtpToken;
import com.project.ConnectX.entity.User;
import com.project.ConnectX.repository.OtpTokenRepository;
import com.project.ConnectX.repository.UserRepository;
import com.project.ConnectX.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;
    private final UserDetailsService userDetailsService;

    @Transactional
    public void register(AuthDTO.RegisterRequest request) {
        log.info("Registration attempt for email: {}", request.getEmail());

        Optional<User> existingUser = userRepository.findByEmail(request.getEmail());

        if (existingUser.isPresent()) {
            User user = existingUser.get();

            // If user exists and is verified, throw error
            if (user.isEmailVerified()) {
                throw new RuntimeException("Email already registered. Please login instead.");
            }

            // If user exists but not verified, allow re-registration
            log.info("User exists but not verified. Allowing re-registration for: {}", request.getEmail());

            // Update user details
            user.setUsername(request.getUsername());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            userRepository.save(user);
        } else {
            // Check if username is taken
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new RuntimeException("Username already taken");
            }

            // Create new user
            User user = new User();
            user.setUsername(request.getUsername());
            user.setEmail(request.getEmail());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setStatus("Hey there! I'm using ChatWave");
            user.setEmailVerified(false);
            userRepository.save(user);

            log.info("New user created with email: {}", request.getEmail());
        }

        // Generate and send OTP
        String otp = generateOTP();
        log.info("Generated OTP for {}: {}", request.getEmail(), otp);

        // Delete any existing OTPs for this email
        otpTokenRepository.deleteByEmail(request.getEmail());

        // Save new OTP
        OtpToken otpToken = new OtpToken();
        otpToken.setEmail(request.getEmail());
        otpToken.setOtp(otp);
        otpToken.setType(OtpToken.OtpType.REGISTRATION);
        otpToken.setExpiryTime(LocalDateTime.now().plusMinutes(10));
        otpToken.setUsed(false);
        otpTokenRepository.save(otpToken);

        log.info("OTP saved to database for email: {}", request.getEmail());

        // Send OTP email
        emailService.sendOtpEmail(request.getEmail(), otp, "registration");
        log.info("OTP email sent to: {}", request.getEmail());
    }

    @Transactional
    public void resendOtp(String email, OtpToken.OtpType type) {
        log.info("Resend OTP request for email: {} and type: {}", email, type);

        // Verify user exists
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        // Generate new OTP
        String otp = generateOTP();
        log.info("Generated new OTP for {}: {}", email, otp);

        // Delete any existing OTPs for this email
        otpTokenRepository.deleteByEmail(email);

        // Save new OTP
        OtpToken otpToken = new OtpToken();
        otpToken.setEmail(email);
        otpToken.setOtp(otp);
        otpToken.setType(type);
        otpToken.setExpiryTime(LocalDateTime.now().plusMinutes(10));
        otpToken.setUsed(false);
        otpTokenRepository.save(otpToken);

        log.info("New OTP saved to database for email: {}", email);

        // Send OTP email
        String emailType = type == OtpToken.OtpType.REGISTRATION ? "registration" : "login";
        emailService.sendOtpEmail(email, otp, emailType);
        log.info("New OTP email sent to: {}", email);
    }

    @Transactional
    public AuthDTO.AuthResponse verifyOtpAndLogin(AuthDTO.VerifyOtpRequest request) {
        log.info("OTP verification attempt for email: {}", request.getEmail());
        log.info("Received OTP: {}", request.getOtp());

        // Find the OTP token
        OtpToken otpToken = otpTokenRepository
                .findByEmailAndOtpAndUsedFalseAndExpiryTimeAfter(
                        request.getEmail().trim(),
                        request.getOtp().trim(),
                        LocalDateTime.now())
                .orElseThrow(() -> {
                    log.error("Invalid or expired OTP for email: {}", request.getEmail());
                    return new RuntimeException("Invalid or expired OTP");
                });

        log.info("OTP token found and validated for: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update user verification status
        user.setEmailVerified(true);
        userRepository.save(user);

        // Mark OTP as used
        otpToken.setUsed(true);
        otpTokenRepository.save(otpToken);

        log.info("User verified: {}", request.getEmail());

        // Load UserDetails for authentication
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());

        // Create authentication token with UserDetails
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate JWT token
        String jwt = tokenProvider.generateToken(authentication);

        AuthDTO.AuthResponse response = new AuthDTO.AuthResponse();
        response.setToken(jwt);
        response.setUser(mapToUserResponse(user));

        log.info("Login successful for: {}", request.getEmail());

        return response;
    }

    public void initiateLogin(AuthDTO.LoginRequest request) {
        log.info("Login initiation for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        if (!user.isEmailVerified()) {
            throw new RuntimeException("Email not verified. Please complete registration first.");
        }

        // Generate OTP
        String otp = generateOTP();
        log.info("Generated OTP for login {}: {}", request.getEmail(), otp);

        // Delete any existing OTPs for this email
        otpTokenRepository.deleteByEmail(request.getEmail());

        OtpToken otpToken = new OtpToken();
        otpToken.setEmail(request.getEmail());
        otpToken.setOtp(otp);
        otpToken.setType(OtpToken.OtpType.LOGIN);
        otpToken.setExpiryTime(LocalDateTime.now().plusMinutes(10));
        otpToken.setUsed(false);
        otpTokenRepository.save(otpToken);

        emailService.sendOtpEmail(request.getEmail(), otp, "login");
        log.info("Login OTP sent to: {}", request.getEmail());
    }

    private String generateOTP() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
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