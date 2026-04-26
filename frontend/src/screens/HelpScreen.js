import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export const HelpScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Frequently Asked Questions</Text>
        
        <View style={[styles.faqCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.question, { color: theme.colors.text }]}>How do I save an article?</Text>
          <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>Tap the bookmark icon when reading an article to save it to your collection.</Text>
        </View>

        <View style={[styles.faqCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.question, { color: theme.colors.text }]}>What is "Ask Layman"?</Text>
          <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>It's an AI assistant that can simplify complex news and answer any questions you have about an article.</Text>
        </View>

        <Text style={styles.heading}>Contact Us</Text>
        <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>Need more help? Email us at support@laymanapp.com</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF4F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: '#2C2522' },
  content: { padding: 24 },
  heading: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: '#D97B47', marginTop: 24, marginBottom: 16 },
  faqCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  question: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#2C2522', marginBottom: 8 },
  answer: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#55433A', lineHeight: 22 },
  paragraph: { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: '#55433A', lineHeight: 24 },
});
