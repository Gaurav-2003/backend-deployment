package com.project.ConnectX.controller;

import com.project.ConnectX.entity.CallLog;
import com.project.ConnectX.repository.CallLogRepository;
import com.project.ConnectX.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class CallController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final CallLogRepository callLogRepository;
    private final UserRepository userRepository;

    @MessageMapping("/call.initiate")
    public void initiateCall(@Payload Map<String, Object> callData) {
        String recipientEmail = callData.get("recipientEmail").toString();
        log.info("Call initiated to: {}", recipientEmail);
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/call", callData);
    }

    @MessageMapping("/call.answer")
    public void answerCall(@Payload Map<String, Object> callData) {
        String callerEmail = callData.get("callerEmail").toString();
        log.info("Call answered from: {}", callerEmail);
        messagingTemplate.convertAndSendToUser(callerEmail, "/queue/call-answer", callData);
    }

    @MessageMapping("/call.reject")
    public void rejectCall(@Payload Map<String, Object> callData) {
        String callerEmail = callData.get("callerEmail").toString();
        log.info("Call rejected by: {}", callerEmail);

        // Save call log
        saveCallLog(callData, CallLog.CallStatus.REJECTED);

        messagingTemplate.convertAndSendToUser(callerEmail, "/queue/call-reject", callData);
    }

    @MessageMapping("/call.end")
    public void endCall(@Payload Map<String, Object> callData) {
        String recipientEmail = callData.get("recipientEmail").toString();
        log.info("Call ended with: {}", recipientEmail);

        // Save call log
        saveCallLog(callData, CallLog.CallStatus.COMPLETED);

        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/call-end", callData);
    }

    @MessageMapping("/webrtc.offer")
    public void handleOffer(@Payload Map<String, Object> offer) {
        String recipientEmail = offer.get("recipientEmail").toString();
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/webrtc-offer", offer);
    }

    @MessageMapping("/webrtc.answer")
    public void handleAnswer(@Payload Map<String, Object> answer) {
        String recipientEmail = answer.get("recipientEmail").toString();
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/webrtc-answer", answer);
    }

    @MessageMapping("/webrtc.ice-candidate")
    public void handleIceCandidate(@Payload Map<String, Object> candidate) {
        String recipientEmail = candidate.get("recipientEmail").toString();
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/ice-candidate", candidate);
    }

    private void saveCallLog(Map<String, Object> callData, CallLog.CallStatus status) {
        try {
            // Implementation to save call log
            log.info("Saving call log with status: {}", status);
        } catch (Exception e) {
            log.error("Error saving call log", e);
        }
    }
}