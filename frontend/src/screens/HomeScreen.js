import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ImageBackground, Image,
  Dimensions, FlatList, TextInput, ActivityIndicator, RefreshControl,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from './HomeScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export const HomeScreen = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const searchAnim = useState(new Animated.Value(0))[0];

  const fetchArticles = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/news?count=10`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.articles) {
        setArticles(data.articles);
      }
    } catch (err) {
      console.warn('Could not fetch articles:', err.message);
      setError('Could not load news. Is the backend running on port 3001?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchArticles();
  };

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== activeSlide) setActiveSlide(slide);
  };

  const handlePressArticle = (article) => {
    navigation.navigate('ArticleDetail', { article });
  };

  const toggleSearch = () => {
    const toValue = searchVisible ? 0 : 1;
    setSearchVisible(!searchVisible);
    Animated.spring(searchAnim, { toValue, useNativeDriver: false }).start();
    if (searchVisible) setSearchQuery('');
  };

  // Split articles: first 2 for featured carousel, rest for today's picks
  const featuredArticles = articles.slice(0, 2);
  const todaysPicks = articles.slice(2);

  const filteredPicks = searchQuery.trim()
    ? todaysPicks.filter(a =>
        a.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.source || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : todaysPicks;

  const filteredFeatured = searchQuery.trim()
    ? featuredArticles.filter(a =>
        a.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.source || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : featuredArticles;

  const renderFeaturedItem = ({ item }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => handlePressArticle(item)} style={styles.carouselCard}>
      <ImageBackground source={{ uri: item.image }} style={styles.carouselImage} resizeMode="cover">
        <LinearGradient
          colors={['transparent', 'rgba(44, 37, 34, 0.4)', 'rgba(217, 123, 71, 0.92)']}
          style={styles.gradientOverlay}
        >
          {item.source ? (
            <View style={styles.sourceTag}>
              <Text style={styles.sourceTagText}>{item.source}</Text>
            </View>
          ) : null}
          <Text style={styles.carouselHeadline} numberOfLines={2}>
            {item.headline}
          </Text>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 10, 20), backgroundColor: theme.colors.background }]}>
        <Text style={[styles.logoText, { color: theme.colors.text }]}>Layman</Text>
        <TouchableOpacity style={styles.searchButton} onPress={toggleSearch} id="home-search-toggle">
          <Ionicons name={searchVisible ? 'close' : 'search'} size={24} color="#D97B47" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={[styles.searchBarContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={18} color="#A09690" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search articles..."
            placeholderTextColor="#A09690"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            id="home-search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#A09690" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D97B47" />
          <Text style={styles.loadingText}>Fetching today's stories...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="wifi-outline" size={40} color="#DBC1B6" />
          <Text style={[styles.loadingText, { textAlign: 'center', marginTop: 8 }]}>{error}</Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); fetchArticles(); }}
            style={{ marginTop: 16, backgroundColor: '#D97B47', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
          >
            <Text style={{ color: '#FFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D97B47" />}
        >
          {/* Featured Carousel */}
          {!searchQuery.trim() ? (
            <View style={styles.carouselContainer}>
              <FlatList
                data={featuredArticles}
                renderItem={renderFeaturedItem}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                snapToInterval={width}
                decelerationRate="fast"
                snapToAlignment="center"
              />
              <View style={styles.paginationContainer}>
                {featuredArticles.map((_, index) => (
                  <View
                    key={index}
                    style={index === activeSlide ? styles.activeDot : styles.dot}
                  />
                ))}
              </View>
            </View>
          ) : filteredFeatured.length > 0 ? (
            <View style={styles.listContainer}>
              {filteredFeatured.map(item => (
                <TouchableOpacity key={item.id} style={styles.articleRow} activeOpacity={0.7} onPress={() => handlePressArticle(item)}>
                  <Image source={{ uri: item.image }} style={styles.articleThumbnail} />
                  <View style={styles.articleHeadlineContainer}>
                    <Text style={styles.articleHeadline} numberOfLines={3}>{item.headline}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Today's Picks */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{searchQuery.trim() ? 'Search Results' : "Today's Picks"}</Text>
            {!searchQuery.trim() && (
              <TouchableOpacity onPress={() => setShowAll(v => !v)}>
                <Text style={styles.viewAllLink}>{showAll ? 'Show Less' : 'View All'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredPicks.length === 0 && searchQuery.trim() ? (
            <View style={styles.emptySearchContainer}>
              <Ionicons name="search-outline" size={40} color="#DBC1B6" />
              <Text style={styles.emptySearchText}>No articles matching "{searchQuery}"</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {(showAll ? filteredPicks : filteredPicks.slice(0, 5)).map((item) => (
                <TouchableOpacity key={item.id} style={[styles.articleRow, { backgroundColor: theme.colors.card }]} activeOpacity={0.7} onPress={() => handlePressArticle(item)}>
                  <Image source={{ uri: item.image }} style={styles.articleThumbnail} />
                  <View style={styles.articleHeadlineContainer}>
                    <Text style={[styles.articleHeadline, { color: theme.colors.text }]} numberOfLines={3}>
                      {item.headline}
                    </Text>
                    {item.source ? (
                      <Text style={styles.articleSource}>{item.source}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};
