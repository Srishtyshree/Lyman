import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
  Keyboard, TouchableWithoutFeedback, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const NOTES_KEY = '@layman_notes';

export const NotesScreen = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [notes, setNotes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem(NOTES_KEY);
      if (storedNotes) setNotes(JSON.parse(storedNotes));
    } catch (e) {
      console.error('Failed to load notes', e);
    }
  };

  const saveNotes = async (updatedNotes) => {
    try {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    } catch (e) {
      console.error('Failed to save notes', e);
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: Date.now().toString(),
      text: newNote.trim(),
      date: new Date().toISOString(),
    };
    saveNotes([note, ...notes]);
    setNewNote('');
    setModalVisible(false);
  };

  const handleDeleteNote = (id) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => saveNotes(notes.filter(n => n.id !== id))
      }
    ]);
  };

  const renderNoteCard = ({ item }) => (
    <View style={[styles.noteCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.noteContent, { color: theme.colors.text }]}>{item.text}</Text>
      <View style={[styles.noteFooter, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.noteDate, { color: theme.colors.textSecondary }]}>
          {new Date(item.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </Text>
        <TouchableOpacity onPress={() => handleDeleteNote(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 10, 20), backgroundColor: theme.colors.background }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)} id="add-note-button">
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={notes}
        renderItem={renderNoteCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={theme.isDark ? '#555' : '#DBC1B6'} />
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No notes yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Jot down thoughts, save interesting facts, or write something you want to remember from your readings.
            </Text>
          </View>
        )}
      />

      {/* Add Note Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom + 20, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>New Note</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.colors.textSecondary}
                value={newNote}
                onChangeText={setNewNote}
                multiline
                autoFocus
              />

              <TouchableOpacity
                style={[styles.saveButton, !newNote.trim() && styles.saveButtonDisabled]}
                onPress={handleAddNote}
                disabled={!newNote.trim()}
              >
                <Text style={styles.saveButtonText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  addButton: {
    backgroundColor: '#D97B47',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D97B47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  noteCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  noteContent: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 24,
    marginBottom: 16,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  noteDate: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: '55%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  textInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    height: 180,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#D97B47',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: { backgroundColor: '#DBC1B6' },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
