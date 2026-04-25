import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView, Dimensions,
  FlatList, TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal, Animated, Linking, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from './ArticleDetailScreen.styles';
import { useSaved } from '../context/SavedContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export const ArticleDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { article } = route.params;
  const { toggleSave, isArticleSaved } = useSaved();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [activeSlide, setActiveSlide] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { id: '1', role: 'bot', text: "Hi, I'm Layman! What can I answer for you?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [originalArticleVisible, setOriginalArticleVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Why does this matter?",
    "Who is behind this?",
    "What happens next?",
  ]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedArticle, setTranslatedArticle] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const chatScrollRef = useRef(null);
  const flatListRef = useRef(null);
  const isSaved = isArticleSaved(article.id);

  // Fetch dynamic AI suggestions when component mounts
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleContext: article.content.join(' '),
          headline: article.headline,
        }),
      });
      const data = await response.json();
      if (data.suggestions && data.suggestions.length === 3) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.warn('Could not fetch suggestions:', err.message);
      // Keep default suggestions
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
    if (slide !== activeSlide) setActiveSlide(slide);
  };

  const handleSave = () => toggleSave(article);

  const handleOpenURL = () => {
    if (article.url) {
      Linking.openURL(article.url).catch(() => setOriginalArticleVisible(true));
    } else {
      setOriginalArticleVisible(true);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this article on Layman: ${article.headline}\n\n${article.url || ''}`,
        url: article.url,
        title: article.headline,
      });
    } catch (error) {
      console.error(error.message);
    }
  };

  const currentArticle = isTranslated && translatedArticle ? translatedArticle : article;

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    
    if (translatedArticle) {
      setIsTranslated(true);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: article.headline,
          content: article.content,
        }),
      });
      const data = await response.json();
      if (data && data.headline && data.content) {
        setTranslatedArticle(data);
        setIsTranslated(true);
      } else {
        alert('Translation failed. Please try again.');
      }
    } catch (err) {
      alert('Could not connect to translation service.');
    } finally {
      setIsTranslating(false);
    }
  };

  const sendChatMessage = async (msg) => {
    if (!msg.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user', text: msg };
    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          articleContext: `${article.headline}. ${article.content.join(' ')}`,
        }),
      });

      const data = await response.json();

      if (data.response) {
        setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: data.response }]);
      } else if (data.error) {
        setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: `⚠️ ${data.error}` }]);
      } else {
        setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: "I'm sorry, I couldn't process that right now." }]);
      }
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: "Network error — make sure the backend server is running on port 3001." }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderContentCard = ({ item, index }) => (
    <View style={[styles.contentCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.cardNumberTag}>
        <Text style={styles.cardNumberText}>{index + 1}/{currentArticle.content.length}</Text>
      </View>
      <Text style={[styles.contentText, { color: theme.colors.text }]}>{item}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20), backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} id="back-button">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleTranslate} id="translate-button">
            {isTranslating ? (
              <ActivityIndicator size="small" color="#D97B47" />
            ) : (
              <Ionicons name="language" size={22} color={isTranslated ? "#D97B47" : theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleOpenURL} id="link-button">
            <Ionicons name="link-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleSave} id="save-button">
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isSaved ? "#D97B47" : theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare} id="share-button">
            <Ionicons name="share-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Article metadata */}
        {article.source && (
          <View style={styles.metaRow}>
            <View style={styles.sourceChip}>
              <Text style={styles.sourceChipText}>{article.source}</Text>
            </View>
            {article.publishedAt && (
              <Text style={styles.dateText}>
                {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
        )}

        <Text style={[styles.headline, { color: theme.colors.text }]}>{currentArticle.headline}</Text>

        <Image source={{ uri: article.image }} style={styles.articleImage} />

        {/* Content Swiper */}
        <View style={styles.swiperContainer}>
          <FlatList
            ref={flatListRef}
            data={currentArticle.content}
            renderItem={renderContentCard}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={width - 40}
            decelerationRate="fast"
            contentContainerStyle={styles.flatlistContent}
          />
          <View style={styles.paginationContainer}>
            {currentArticle.content.map((_, index) => (
              <View
                key={index}
                style={index === activeSlide ? styles.activeDot : styles.dot}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Ask Layman Button */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.askButton} onPress={() => setChatVisible(true)} id="ask-layman-button">
          <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.askButtonText}>Ask Layman</Text>
        </TouchableOpacity>
      </View>

      {/* Original Article Pop-up */}
      <Modal
        visible={originalArticleVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setOriginalArticleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.originalContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.chatHeader}>
              <Text style={styles.originalTitle}>Original Article</Text>
              <TouchableOpacity onPress={() => setOriginalArticleVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.originalHeadlineText, { color: theme.colors.text }]}>{article.originalHeadline}</Text>
              <Text style={[styles.originalContentText, { color: theme.colors.textSecondary }]}>{article.originalContent}</Text>
              {article.url ? (
                <TouchableOpacity
                  style={styles.readOriginalButton}
                  onPress={() => {
                    setOriginalArticleVisible(false);
                    Linking.openURL(article.url);
                  }}
                >
                  <Text style={styles.readOriginalText}>Read Full Article →</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Chatbot Modal */}
      <Modal
        visible={chatVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.chatContainer, { backgroundColor: theme.colors.background }]}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <View style={{ width: 24 }} />
              <Text style={[styles.chatTitle, { color: theme.colors.text }]}>Ask Layman</Text>
              <TouchableOpacity onPress={() => setChatVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.chatSubtitle, { color: theme.colors.textSecondary }]}>
              Simple, short answers in everyday language. No fluff, no jargon.
            </Text>

            {/* Chat History */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatHistoryContainer}
              contentContainerStyle={{ paddingBottom: 20 }}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chatHistory.map((msg) => (
                <View
                  key={msg.id}
                  style={msg.role === 'bot' ? styles.botMessageRow : styles.userMessageRow}
                >
                  {msg.role === 'bot' && (
                    <View style={styles.botIconContainer}>
                    <Ionicons name="flash" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={[
                    styles.messageBubble,
                    msg.role === 'bot' 
                      ? [styles.botBubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }] 
                      : styles.userBubble
                  ]}>
                    <Text style={[
                      styles.messageText, 
                      { color: msg.role === 'bot' ? theme.colors.text : '#FFFFFF' }
                    ]}>
                      {msg.text}
                    </Text>
                  </View>
                  {msg.role === 'user' && (
                    <View style={[styles.userIconContainer, { backgroundColor: theme.isDark ? '#333' : '#EBE1DA' }]}>
                      <Ionicons name="person" size={14} color={theme.isDark ? '#AAA' : '#2C2522'} />
                    </View>
                  )}
                </View>
              ))}

              {isTyping && (
                <View style={styles.botMessageRow}>
                  <View style={styles.botIconContainer}>
                    <Ionicons name="flash" size={14} color="#FFFFFF" />
                  </View>
                  <View style={[styles.messageBubble, styles.botBubble]}>
                    <ActivityIndicator size="small" color="#D97B47" />
                  </View>
                </View>
              )}

              {/* Suggestions — show when only welcome message exists */}
              {!isTyping && chatHistory.length === 1 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={[styles.suggestionsTitle, { color: theme.colors.textSecondary }]}>
                    {loadingSuggestions ? 'Generating suggestions...' : 'Ask me about this article:'}
                  </Text>
                  {loadingSuggestions ? (
                    <ActivityIndicator size="small" color="#D97B47" style={{ marginTop: 8 }} />
                  ) : (
                    suggestions.map((question, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.suggestionChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                        onPress={() => sendChatMessage(question)}
                        id={`suggestion-chip-${index}`}
                      >
                        <Text style={styles.suggestionText}>{question}</Text>
                        <Ionicons name="arrow-forward" size={14} color="#D97B47" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.chatInput, { color: theme.colors.text }]}
                placeholder="Type your question..."
                placeholderTextColor={theme.colors.textSecondary}
                value={chatMessage}
                onChangeText={setChatMessage}
                onSubmitEditing={() => sendChatMessage(chatMessage)}
                returnKeyType="send"
                id="chat-input"
              />
              <TouchableOpacity style={styles.micButton} id="mic-button">
                <Ionicons name="mic-outline" size={20} color="#D97B47" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, !chatMessage.trim() && styles.sendButtonDisabled]}
                onPress={() => sendChatMessage(chatMessage)}
                disabled={!chatMessage.trim()}
                id="send-button"
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
