package com.project.ConnectX.service;

import com.project.ConnectX.entity.Message;
import edu.stanford.nlp.pipeline.CoreDocument;
import edu.stanford.nlp.pipeline.StanfordCoreNLP;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.regex.Pattern;

@Service
@Slf4j
public class SentimentAnalysisService {

    private StanfordCoreNLP pipeline;

    // Extended emotion keywords
    private static final Map<String, List<String>> EMOTION_KEYWORDS = new HashMap<>();
    private static final Map<String, Pattern> EMOJI_PATTERNS = new HashMap<>();

    @PostConstruct
    public void init() {
        // Initialize Stanford NLP (optional - can be heavy)
        try {
            Properties props = new Properties();
            props.setProperty("annotators", "tokenize,ssplit,pos,parse,sentiment");
            props.setProperty("ssplit.eolonly", "true");
            pipeline = new StanfordCoreNLP(props);
            log.info("Stanford CoreNLP initialized successfully");
        } catch (Exception e) {
            log.warn("Stanford CoreNLP initialization failed, using keyword-based analysis only", e);
        }

        // Initialize emotion keywords
        initializeEmotionKeywords();
        initializeEmojiPatterns();
    }

    private void initializeEmotionKeywords() {
        // Happy keywords
        EMOTION_KEYWORDS.put("HAPPY", Arrays.asList(
                "happy", "joy", "excited", "great", "awesome", "wonderful", "fantastic",
                "excellent", "amazing", "love", "lovely", "beautiful", "perfect", "yay",
                "woohoo", "haha", "lol", "celebrate", "congratulations", "congrats",
                "blessed", "grateful", "thankful", "delighted", "cheerful", "pleased"
        ));

        // Sad keywords
        EMOTION_KEYWORDS.put("SAD", Arrays.asList(
                "sad", "unhappy", "depressed", "miserable", "awful", "terrible",
                "disappointed", "heartbroken", "crying", "tears", "sorrow", "grief",
                "unfortunate", "sorry", "regret", "miss", "lonely", "alone", "hurt"
        ));

        // Angry keywords
        EMOTION_KEYWORDS.put("ANGRY", Arrays.asList(
                "angry", "mad", "furious", "rage", "hate", "annoyed", "irritated",
                "frustrated", "pissed", "outraged", "disgusted", "damn", "stupid",
                "idiot", "ridiculous", "unacceptable", "horrible", "worst"
        ));

        // Confused keywords
        EMOTION_KEYWORDS.put("CONFUSED", Arrays.asList(
                "confused", "what", "huh", "unclear", "puzzled", "perplexed",
                "don't understand", "not sure", "uncertain", "doubt", "wonder",
                "weird", "strange", "odd", "hmm", "???", "confusing"
        ));

        // Excited keywords
        EMOTION_KEYWORDS.put("EXCITED", Arrays.asList(
                "excited", "can't wait", "eager", "thrilled", "pumped", "stoked",
                "omg", "wow", "incredible", "unbelievable", "awesome", "amazing",
                "yay", "woohoo", "yeahh", "finally", "at last"
        ));

        // Fearful keywords
        EMOTION_KEYWORDS.put("FEARFUL", Arrays.asList(
                "scared", "afraid", "fear", "worried", "anxious", "nervous",
                "terrified", "frightened", "panic", "stress", "concerned", "uneasy"
        ));

        // Surprised keywords
        EMOTION_KEYWORDS.put("SURPRISED", Arrays.asList(
                "surprised", "shock", "unexpected", "sudden", "omg", "wow",
                "no way", "really", "seriously", "can't believe", "amazing"
        ));

        // Loving keywords
        EMOTION_KEYWORDS.put("LOVING", Arrays.asList(
                "love", "adore", "cherish", "care", "affection", "dear",
                "darling", "sweetheart", "honey", "babe", "kiss", "hug",
                "miss you", "thinking of you", "cuddle", "romantic"
        ));
    }

    private void initializeEmojiPatterns() {
        // Happy emojis
        EMOJI_PATTERNS.put("HAPPY", Pattern.compile(
                "[😀😁😂🤣😃😄😅😆😊☺️🙂😇🥰😍🤗😘😗😙😚]"
        ));

        // Sad emojis
        EMOJI_PATTERNS.put("SAD", Pattern.compile(
                "[😢😭😞😔😟😕🙁☹️😣😖😫😩🥺😪]"
        ));

        // Angry emojis
        EMOJI_PATTERNS.put("ANGRY", Pattern.compile(
                "[😠😡🤬😤😾💢]"
        ));

        // Confused emojis
        EMOJI_PATTERNS.put("CONFUSED", Pattern.compile(
                "[😕😟🤔😐😑🙄😬😯😦😧😮]"
        ));

        // Excited emojis
        EMOJI_PATTERNS.put("EXCITED", Pattern.compile(
                "[🤩😍🥳🎉🎊🙌👏🎈]"
        ));

        // Fearful emojis
        EMOJI_PATTERNS.put("FEARFUL", Pattern.compile(
                "[😨😰😱🥶😥😓]"
        ));

        // Loving emojis
        EMOJI_PATTERNS.put("LOVING", Pattern.compile(
                "[❤️💕💖💗💓💞💝🥰😍😘💋]"
        ));
    }

    public Message.Sentiment analyzeSentiment(String text) {
        if (text == null || text.trim().isEmpty()) {
            return Message.Sentiment.NEUTRAL;
        }

        String lowerText = text.toLowerCase();

        // Analyze using multiple methods
        Map<String, Integer> emotionScores = new HashMap<>();

        // 1. Emoji-based analysis
        analyzeEmojis(text, emotionScores);

        // 2. Keyword-based analysis
        analyzeKeywords(lowerText, emotionScores);

        // 3. Stanford NLP analysis (if available)
        if (pipeline != null) {
            analyzeWithStanford(text, emotionScores);
        }

        // Determine dominant emotion
        String dominantEmotion = getDominantEmotion(emotionScores);

        // Map to Message.Sentiment enum
        return mapToSentiment(dominantEmotion);
    }

    private void analyzeEmojis(String text, Map<String, Integer> scores) {
        for (Map.Entry<String, Pattern> entry : EMOJI_PATTERNS.entrySet()) {
            long count = entry.getValue().matcher(text).results().count();
            if (count > 0) {
                scores.merge(entry.getKey(), (int) count * 3, Integer::sum); // Emojis have higher weight
            }
        }
    }

    private void analyzeKeywords(String text, Map<String, Integer> scores) {
        for (Map.Entry<String, List<String>> entry : EMOTION_KEYWORDS.entrySet()) {
            int count = 0;
            for (String keyword : entry.getValue()) {
                if (text.contains(keyword)) {
                    count++;
                }
            }
            if (count > 0) {
                scores.merge(entry.getKey(), count, Integer::sum);
            }
        }
    }

    private void analyzeWithStanford(String text, Map<String, Integer> scores) {
        try {
            CoreDocument document = new CoreDocument(text);
            pipeline.annotate(document);

            String sentiment = document.sentences().get(0).sentiment();

            switch (sentiment) {
                case "Very positive":
                    scores.merge("EXCITED", 3, Integer::sum);
                    break;
                case "Positive":
                    scores.merge("HAPPY", 2, Integer::sum);
                    break;
                case "Very negative":
                    scores.merge("ANGRY", 3, Integer::sum);
                    break;
                case "Negative":
                    scores.merge("SAD", 2, Integer::sum);
                    break;
            }
        } catch (Exception e) {
            log.debug("Stanford NLP analysis failed for text: {}", text, e);
        }
    }

    private String getDominantEmotion(Map<String, Integer> scores) {
        if (scores.isEmpty()) {
            return "NEUTRAL";
        }

        return scores.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("NEUTRAL");
    }

    private Message.Sentiment mapToSentiment(String emotion) {
        return switch (emotion) {
            case "HAPPY", "EXCITED", "LOVING" -> Message.Sentiment.POSITIVE;
            case "SAD", "ANGRY", "FEARFUL" -> Message.Sentiment.NEGATIVE;
            case "CONFUSED", "SURPRISED" -> Message.Sentiment.NEUTRAL;
            default -> Message.Sentiment.NEUTRAL;
        };
    }

    // Public method to get detailed emotion (for frontend)
    public String getDetailedEmotion(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "NEUTRAL";
        }

        String lowerText = text.toLowerCase();
        Map<String, Integer> emotionScores = new HashMap<>();

        analyzeEmojis(text, emotionScores);
        analyzeKeywords(lowerText, emotionScores);

        if (pipeline != null) {
            analyzeWithStanford(text, emotionScores);
        }

        return getDominantEmotion(emotionScores);
    }
}