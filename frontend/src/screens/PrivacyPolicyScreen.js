import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>1. Data Collection</Text>
        <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>We collect information you provide directly to us when you create an account, save articles, or use the Layman service.</Text>
        
        <Text style={styles.heading}>2. Use of Data</Text>
        <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>Your data is used to provide, maintain, and improve our services. We do not sell your personal data to third parties.</Text>
        
        <Text style={styles.heading}>3. AI Features</Text>
        <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>Interactions with "Ask Layman" may be processed by external AI providers (such as Google Gemini). Please do not share sensitive personal information with the chatbot.</Text>
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
  heading: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: '#D97B47', marginTop: 24, marginBottom: 8 },
  paragraph: { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: '#55433A', lineHeight: 24 },
});
