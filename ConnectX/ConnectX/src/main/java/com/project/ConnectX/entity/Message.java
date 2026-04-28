package com.project.ConnectX.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_sender_recipient", columnList = "sender_id,recipient_id"),
        @Index(name = "idx_timestamp", columnList = "timestamp")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    private MessageType messageType = MessageType.TEXT;

    @Enumerated(EnumType.STRING)
    private MessageStatus status = MessageStatus.SENT;

    @Enumerated(EnumType.STRING)
    private Sentiment sentiment;

    @Enumerated(EnumType.STRING)
    private DetailedEmotion detailedEmotion; // New field for detailed emotions

    private String fileUrl;
    private String fileName;
    private Long fileSize;

    @CreationTimestamp
    private LocalDateTime timestamp;

    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;

    public enum MessageType {
        TEXT, IMAGE, FILE, AUDIO, VIDEO
    }

    public enum MessageStatus {
        SENT, DELIVERED, READ
    }

    public enum Sentiment {
        POSITIVE, NEGATIVE, NEUTRAL
    }

    // New detailed emotion enum
    public enum DetailedEmotion {
        HAPPY, SAD, ANGRY, CONFUSED, EXCITED, FEARFUL, SURPRISED, LOVING, NEUTRAL
    }
}