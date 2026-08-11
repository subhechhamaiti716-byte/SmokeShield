import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { apiRequest } from '../utils/api';

interface Message {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  suggested_intervention?: string | null;
}

interface ChatTabProps {
  onNavigateToTab: (tab: string) => void;
}

export function ChatTab({ onNavigateToTab }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const initChat = async () => {
    try {
      // Fetch latest conversations
      const convs = await apiRequest('/ai/conversations');
      if (convs && convs.length > 0) {
        const latestConv = convs[0];
        setConversationId(latestConv.conversation_id);
        
        // Fetch message logs for latest conversation
        const details = await apiRequest(`/ai/conversations/${latestConv.conversation_id}`);
        if (details && details.messages) {
          const formatted = details.messages
            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map((msg: any) => ({
              id: msg.message_id,
              sender: msg.sender_type,
              text: msg.message_text,
              suggested_intervention: msg.suggested_intervention,
            }));
          setMessages(formatted);
        }
      } else {
        // Welcome message if fresh
        setMessages([
          {
            id: 'welcome',
            sender: 'AI',
            text: "Hello! I am your SmokeShield AI Coach. I'm here to support you whenever a craving strikes, or when you just need some motivation. How can I help you right now?",
          },
        ]);
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, sending]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);

    // Optimistically add user message
    const userMsgId = Math.random().toString();
    const userMsg: Message = { id: userMsgId, sender: 'USER', text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId || undefined,
        }),
      });

      if (response) {
        if (!conversationId && response.conversation_id) {
          setConversationId(response.conversation_id);
        }

        const aiMsg: Message = {
          id: response.message_id || Math.random().toString(),
          sender: 'AI',
          text: response.response,
          suggested_intervention: response.suggested_intervention,
        };

        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'AI',
          text: "I'm sorry, I'm having trouble connecting right now. Remember: cravings peak within 3-5 minutes. Take deep breaths—you can get through this!",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const getInterventionLabel = (type: string) => {
    switch (type) {
      case 'breathing': return 'Box Breathing Exercise 💨';
      case 'walking': return '10-Minute Mindful Walk 🚶';
      case 'mindfulness': return 'Meditation Session 🧘';
      case 'water': return 'Drink Cold Water 💧';
      case 'distraction': return 'Quick Distraction Game 🎮';
      case 'journaling': return 'Journal Writing 📝';
      default: return 'Coping Exercise';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.keyboardContainer}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>AI Coach</ThemedText>
          <ThemedText style={styles.subtitle}>Empathetic, real-time quit support</ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0d9488" />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg) => {
              const isAI = msg.sender === 'AI';
              return (
                <View key={msg.id} style={styles.messageRow}>
                  <View style={[styles.bubbleContainer, isAI ? styles.aiContainer : styles.userContainer]}>
                    <ThemedView
                      type={isAI ? 'backgroundElement' : 'backgroundSelected'}
                      style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}
                    >
                      <ThemedText style={styles.messageText}>{msg.text}</ThemedText>
                    </ThemedView>
                    
                    {isAI && msg.suggested_intervention && (
                      <TouchableOpacity
                        style={styles.interventionCard}
                        onPress={() => onNavigateToTab('coping')}
                      >
                        <ThemedText style={styles.interventionCardLabel}>💡 Recommended Coping Activity</ThemedText>
                        <ThemedText style={styles.interventionCardAction}>
                          Start {getInterventionLabel(msg.suggested_intervention)} →
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            
            {sending && (
              <View style={styles.messageRow}>
                <View style={[styles.bubbleContainer, styles.aiContainer]}>
                  <ThemedView type="backgroundElement" style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color="#94a3b8" />
                  </ThemedView>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message or trigger name..."
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!loading && !sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <ThemedText style={styles.sendBtnText}>Send</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    marginBottom: Spacing.three,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 24,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: Spacing.one,
  },
  bubbleContainer: {
    maxWidth: '82%',
  },
  aiContainer: {
    alignSelf: 'flex-start',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  aiBubble: {
    borderTopLeftRadius: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  userBubble: {
    borderTopRightRadius: 4,
    backgroundColor: '#0d9488',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  typingBubble: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  interventionCard: {
    marginTop: Spacing.two,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  interventionCardLabel: {
    color: '#14b8a6',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interventionCardAction: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: Spacing.one,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#0b0f19',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    color: '#ffffff',
    paddingHorizontal: Spacing.four,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    marginRight: Spacing.two,
  },
  sendBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 20,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
