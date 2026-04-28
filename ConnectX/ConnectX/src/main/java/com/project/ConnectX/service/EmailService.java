package com.project.ConnectX.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String to, String otp, String type) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("ChatWave - OTP Verification");
            message.setText(buildOtpEmailContent(otp, type));
            message.setFrom("noreply@chatwave.com");

            mailSender.send(message);
            log.info("OTP email sent successfully to: {}", to);
            log.info("OTP sent: {}", otp); // Remove this in production!
        } catch (Exception e) {
            log.error("Failed to send OTP email to: {}", to, e);
            throw new RuntimeException("Failed to send OTP email", e);
        }
    }

    private String buildOtpEmailContent(String otp, String type) {
        return String.format("""
                Welcome to ConnectX!
                
                Your OTP for %s is:
                
                %s
                
                This OTP will expire in 10 minutes.
                Please do not share this code with anyone.
                
                If you didn't request this, please ignore this email.
                
                Best regards,
                ConnectX Team
                """, type, otp);
    }
}