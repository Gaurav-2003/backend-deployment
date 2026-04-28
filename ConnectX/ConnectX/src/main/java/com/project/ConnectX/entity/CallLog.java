package com.project.ConnectX.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "call_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "caller_id")
    private User caller;

    @ManyToOne
    @JoinColumn(name = "callee_id")
    private User callee;

    @Enumerated(EnumType.STRING)
    private CallType callType;

    @Enumerated(EnumType.STRING)
    private CallStatus callStatus;

    @CreationTimestamp
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer duration; // in seconds

    public enum CallType {
        VOICE, VIDEO
    }

    public enum CallStatus {
        COMPLETED, MISSED, REJECTED, CANCELLED
    }
}
