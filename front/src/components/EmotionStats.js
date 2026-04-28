// frontend/src/components/EmotionStats.js
import React from 'react';
import { Box, Paper, Typography, LinearProgress } from '@mui/material';

const EmotionStats = ({ messages }) => {
  const getEmotionStats = () => {
    const stats = {
      HAPPY: 0, SAD: 0, ANGRY: 0, CONFUSED: 0,
      EXCITED: 0, FEARFUL: 0, SURPRISED: 0, LOVING: 0, NEUTRAL: 0
    };
    
    messages.forEach(msg => {
      if (msg.detailedEmotion) {
        stats[msg.detailedEmotion]++;
      }
    });
    
    return stats;
  };

  const stats = getEmotionStats();
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  const emotionColors = {
    HAPPY: '#4CAF50',
    SAD: '#2196F3',
    ANGRY: '#F44336',
    CONFUSED: '#FF9800',
    EXCITED: '#9C27B0',
    FEARFUL: '#607D8B',
    SURPRISED: '#00BCD4',
    LOVING: '#E91E63',
    NEUTRAL: '#9E9E9E'
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Conversation Emotions
      </Typography>
      {Object.entries(stats).map(([emotion, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return percentage > 0 ? (
          <Box key={emotion} sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption">{emotion}</Typography>
              <Typography variant="caption">{count} ({percentage.toFixed(1)}%)</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: emotionColors[emotion]
                }
              }}
            />
          </Box>
        ) : null;
      })}
    </Paper>
  );
};

export default EmotionStats;