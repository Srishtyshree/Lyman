import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Alert, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSaved } from '../context/SavedContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const AVATAR_COLORS = ['#D97B47', '#6B8CBA', '#6BAA8C', '#BA6B8C'];

export const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const { savedArticles } = useSaved();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleDarkMode } = useTheme();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setEditFirstName(user?.user_metadata?.first_name || '');
      setEditLastName(user?.user_metadata?.last_name || '');
    });
    loadAvatar();
  }, []);

  const loadAvatar = async () => {
    try {
      const savedAvatar = await AsyncStorage.getItem('@layman_avatar');
      if (savedAvatar) setAvatarUri(savedAvatar);
    } catch (e) {
      console.log('Could not load avatar', e);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await supabase.auth.signOut();
            setLoading(false);
          }
        }
      ]
    );
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: editFirstName,
          last_name: editLastName,
        }
      });
      if (error) throw error;
      
      setUser(data.user);
      if (avatarUri) {
        await AsyncStorage.setItem('@layman_avatar', avatarUri);
      }
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Could not update profile: ' + error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Reader';
  const email = user?.email || '';
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const avatarColor = AVATAR_COLORS[fullName.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <LinearGradient
        colors={theme.isDark ? ['#1C1C1E', '#0F0F0F'] : ['#FEE8D8', '#FAF4F0']}
        style={[styles.profileGradient, { paddingTop: Math.max(insets.top + 20, 60) }]}
      >
        <TouchableOpacity style={styles.avatarContainer} onPress={() => setEditModalVisible(true)}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarCircle} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.editAvatarBadge}>
            <Ionicons name="camera" size={13} color="#FFF" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.userName, { color: theme.colors.text }]}>{fullName}</Text>
        <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{email}</Text>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: theme.colors.card, shadowColor: theme.isDark ? '#000' : '#C8A898' }]}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{savedArticles.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Saved</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>∞</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Articles</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>AI</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Powered</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <SettingRow icon="person-outline" label="Full Name" value={fullName} onPress={() => setEditModalVisible(true)} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
          <SettingDivider borderColor={theme.colors.border} />
          <SettingRow icon="mail-outline" label="Email" value={email} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
          <SettingDivider borderColor={theme.colors.border} />
          <SettingRow icon="shield-checkmark-outline" label="Account Status" value="Verified" valueColor="#4CAF50" textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
          <SettingDivider borderColor={theme.colors.border} />
          <SettingRow icon="lock-closed-outline" label="Security" showChevron onPress={() => navigation.navigate('Security')} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Preferences</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <ToggleRow icon="notifications-outline" label="Push Notifications" value={true} onToggle={() => {}} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
          <SettingDivider borderColor={theme.colors.border} />
          <ToggleRow icon="moon-outline" label="Dark Mode" value={isDarkMode} onToggle={toggleDarkMode} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
          <SettingDivider borderColor={theme.colors.border} />
          <ToggleRow icon="text-outline" label="Simplified Language" value={true} onToggle={() => {}} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <SettingRow icon="information-circle-outline" label="App Version" value="1.0.0" textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
          <SettingDivider borderColor={theme.colors.border} />
          <SettingRow icon="document-text-outline" label="Privacy Policy" showChevron onPress={() => navigation.navigate('PrivacyPolicy')} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
          <SettingDivider borderColor={theme.colors.border} />
          <SettingRow icon="help-circle-outline" label="Help & Support" showChevron onPress={() => navigation.navigate('Help')} textColor={theme.colors.text} iconBg={theme.isDark ? '#252528' : '#FEE8D8'} />
        </View>
      </View>

      {/* Sign Out Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.signOutButton,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.isDark ? '#3A2020' : '#FEE8D8',
            }
          ]}
          onPress={handleLogout}
          disabled={loading}
          id="sign-out-button"
        >
          <Ionicons name="log-out-outline" size={20} color="#D97B47" style={{ marginRight: 10 }} />
          <Text style={styles.signOutText}>{loading ? 'Signing out...' : 'Sign Out'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom + 20, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#8A7D77" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <TouchableOpacity style={styles.modalAvatarContainer} onPress={handlePickImage}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.modalAvatar} />
                  ) : (
                    <View style={[styles.modalAvatar, { backgroundColor: avatarColor, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                  )}
                  <View style={styles.modalCameraBadge}>
                    <Ionicons name="camera" size={16} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="First Name"
                />

                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Last Name"
                />

                <TouchableOpacity 
                  style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]} 
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  <Text style={styles.saveButtonText}>{savingProfile ? 'Saving...' : 'Save Profile'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const SettingRow = ({ icon, label, value, valueColor, showChevron, onPress, textColor, iconBg }) => (
  <TouchableOpacity style={styles.settingRow} activeOpacity={onPress || showChevron ? 0.7 : 1} onPress={onPress} disabled={!onPress && !showChevron}>
    <View style={styles.settingLeft}>
      <View style={[styles.settingIconContainer, iconBg && { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#D97B47" />
      </View>
      <Text style={[styles.settingLabel, textColor && { color: textColor }]}>{label}</Text>
    </View>
    <View style={styles.settingRight}>
      {value ? (
        <Text style={[styles.settingValue, valueColor && { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {showChevron && <Ionicons name="chevron-forward" size={16} color={textColor || '#A09690'} style={{ marginLeft: 4 }} />}
    </View>
  </TouchableOpacity>
);

const ToggleRow = ({ icon, label, value, onToggle, textColor, iconBg }) => {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIconContainer, iconBg && { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color="#D97B47" />
        </View>
        <Text style={[styles.settingLabel, textColor && { color: textColor }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#EBE1DA', true: '#FFCBA4' }}
        thumbColor={value ? '#D97B47' : '#FFFFFF'}
        ios_backgroundColor="#EBE1DA"
      />
    </View>
  );
};

const SettingDivider = ({ borderColor }) => <View style={[styles.settingDivider, borderColor && { backgroundColor: borderColor }]} />;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF4F0',
  },
  profileGradient: {
    paddingBottom: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2C2522',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#8A7D77',
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: '100%',
    shadowColor: '#C8A898',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#D97B47',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#8A7D77',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EBE1DA',
    marginHorizontal: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#8A7D77',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEE8D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#2C2522',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#8A7D77',
    maxWidth: 130,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F5EDE8',
    marginHorizontal: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#FEE8D8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#D97B47',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#D97B47',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FAF4F0',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FAF4F0',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2C2522',
  },
  modalBody: {
    gap: 16,
  },
  modalAvatarContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  modalCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#D97B47',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FAF4F0',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#8A7D77',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#2C2522',
    borderWidth: 1,
    borderColor: '#EBE1DA',
  },
  saveButton: {
    backgroundColor: '#D97B47',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#DBC1B6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
