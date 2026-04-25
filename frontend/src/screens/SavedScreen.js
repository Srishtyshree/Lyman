import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput
} from 'react-native';
import { useSaved } from '../context/SavedContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export const SavedScreen = () => {
  const { savedArticles } = useSaved();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handlePressArticle = (article) => {
    navigation.navigate('ArticleDetail', { article });
  };

  const toggleSearch = () => {
    setSearchVisible(v => !v);
    setSearchQuery('');
  };

  const filteredArticles = searchQuery.trim()
    ? savedArticles.filter(a =>
        a.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.source || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : savedArticles;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 10, 20), backgroundColor: theme.colors.background }]}>
        <Text style={[styles.header, { color: theme.colors.text }]}>Saved</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={toggleSearch}
          id="saved-search-toggle"
        >
          <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color="#D97B47" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={[styles.searchBarContainer, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="search" size={18} color="#A09690" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search saved articles..."
            placeholderTextColor="#A09690"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            id="saved-search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#A09690" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {savedArticles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bookmark-outline" size={40} color="#DBC1B6" />
          </View>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyText}>
            Tap the bookmark icon on any article to save it here for later.
          </Text>
        </View>
      ) : filteredArticles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={40} color="#DBC1B6" />
          <Text style={styles.emptyText}>No saved articles matching "{searchQuery}"</Text>
        </View>
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.articleRow, { backgroundColor: theme.colors.card }]}
              activeOpacity={0.7}
              onPress={() => handlePressArticle(item)}
            >
              <Image source={{ uri: item.image }} style={styles.articleThumbnail} />
              <View style={styles.articleHeadlineContainer}>
                <Text style={[styles.articleHeadline, { color: theme.colors.text }]} numberOfLines={3}>
                  {item.headline}
                </Text>
                {item.source ? (
                  <Text style={styles.articleSource}>{item.source}</Text>
                ) : null}
              </View>
              <Ionicons name="bookmark" size={18} color="#D97B47" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF4F0',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  header: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2C2522',
    letterSpacing: -0.5,
  },
  searchButton: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#2C2522',
    height: 36,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#2C2522',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  articleThumbnail: {
    width: 76,
    height: 76,
    borderRadius: 14,
    marginRight: 14,
  },
  articleHeadlineContainer: {
    flex: 1,
    gap: 6,
  },
  articleHeadline: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2C2522',
    lineHeight: 20,
  },
  articleSource: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#D97B47',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF7F3',
    borderWidth: 1.5,
    borderColor: '#EBE1DA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2C2522',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#8A7D77',
    textAlign: 'center',
    lineHeight: 22,
  },
});
