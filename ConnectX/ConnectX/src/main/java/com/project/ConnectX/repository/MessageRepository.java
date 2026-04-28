package com.project.ConnectX.repository;

import com.project.ConnectX.entity.Message;
import com.project.ConnectX.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE " +
            "(m.sender.id = :userId1 AND m.recipient.id = :userId2) OR " +
            "(m.sender.id = :userId2 AND m.recipient.id = :userId1) " +
            "ORDER BY m.timestamp DESC")
    Page<Message> findConversation(Long userId1, Long userId2, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.recipient.id = :userId " +
            "AND m.sender.id = :senderId AND m.status != 'READ'")
    Integer countUnreadMessages(Long userId, Long senderId);

    @Query("SELECT m FROM Message m WHERE m.recipient = :user AND m.status != 'READ'")
    List<Message> findUnreadMessages(User user);

    @Query("SELECT DISTINCT CASE WHEN m.sender.id = :userId THEN m.recipient " +
            "ELSE m.sender END FROM Message m WHERE m.sender.id = :userId OR m.recipient.id = :userId")
    List<User> findChatPartners(Long userId);
}
