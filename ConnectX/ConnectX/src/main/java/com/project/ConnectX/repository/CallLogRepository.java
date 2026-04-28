package com.project.ConnectX.repository;

import com.project.ConnectX.entity.CallLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CallLogRepository extends JpaRepository<CallLog, Long> {

    @Query("SELECT c FROM CallLog c WHERE c.caller.id = :userId OR c.callee.id = :userId " +
            "ORDER BY c.startTime DESC")
    List<CallLog> findUserCallLogs(Long userId);
}
