import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { askFodcoAi, explainFodcoAi, ChatMessage } from './fodcoAiService';
import { FormattedAiText } from './FormattedAiText';
import { ScannedProduct } from '../DASHBOARD/productService';

export interface FodcoAiChatModalProps {
  visible: boolean;
  product: ScannedProduct | null;
  onClose: () => void;
}

export function FodcoAiChatModal({ visible, product, onClose }: FodcoAiChatModalProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (visible && product) {
      const cacheKey = `@foodco_ai_chat_${product.barcode || encodeURIComponent(product.name)}`;
      setLoading(true);

      AsyncStorage.getItem(cacheKey)
        .then((cached) => {
          if (!isMounted) return;
          if (cached) {
            try {
              const parsed: ChatMessage[] = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMessages(parsed);
                setLoading(false);
                return;
              }
            } catch {}
          }

          return explainFodcoAi(product)
            .then(async (explanation) => {
              if (!isMounted) return;
              const initMsg: ChatMessage = {
                id: `init-${Date.now()}`,
                role: 'assistant',
                content: explanation,
                timestamp: Date.now(),
              };
              setMessages([initMsg]);
              await AsyncStorage.setItem(cacheKey, JSON.stringify([initMsg]));
            })
            .catch(async () => {
              if (!isMounted) return;
              const fallbackMsg: ChatMessage = {
                id: `init-err-${Date.now()}`,
                role: 'assistant',
                content: `Hello! I am your Foodco AI health advisor. Ask me anything about ${product.name} (ingredients, safety, alternatives, suitability, etc.).`,
                timestamp: Date.now(),
              };
              setMessages([fallbackMsg]);
              await AsyncStorage.setItem(cacheKey, JSON.stringify([fallbackMsg]));
            })
            .finally(() => {
              if (isMounted) setLoading(false);
            });
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    }

    if (!visible) {
      setMessages([]);
      setInputText('');
    }

    return () => {
      isMounted = false;
    };
  }, [visible, product]);

  const handleClearChat = async () => {
    if (!product || loading) return;
    const cacheKey = `@foodco_ai_chat_${product.barcode || encodeURIComponent(product.name)}`;
    await AsyncStorage.removeItem(cacheKey);
    setLoading(true);
    setMessages([]);
    try {
      const explanation = await explainFodcoAi(product);
      const initMsg: ChatMessage = {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: explanation,
        timestamp: Date.now(),
      };
      setMessages([initMsg]);
      await AsyncStorage.setItem(cacheKey, JSON.stringify([initMsg]));
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `init-err-${Date.now()}`,
        role: 'assistant',
        content: `Hello! I am your Foodco AI health advisor. Ask me anything about ${product.name} (ingredients, safety, alternatives, suitability, etc.).`,
        timestamp: Date.now(),
      };
      setMessages([fallbackMsg]);
      await AsyncStorage.setItem(cacheKey, JSON.stringify([fallbackMsg]));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading || !product) return;

    const cacheKey = `@foodco_ai_chat_${product.barcode || encodeURIComponent(product.name)}`;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    await AsyncStorage.setItem(cacheKey, JSON.stringify(newMessages));

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const history = newMessages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await askFodcoAi(product, text, history);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(finalMessages));
    } catch (err: any) {
      const errAiMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I had trouble answering that. Please try again.',
        timestamp: Date.now(),
      };
      const finalMessages = [...newMessages, errAiMsg];
      setMessages(finalMessages);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(finalMessages));
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  if (!visible || !product) return null;

  const quickPrompts = [
    'Is it safe for daily use?',
    'What are healthier alternatives?',
    'Any bad ingredients?',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.closeCircleBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-down" size={24} color="#1E1D25" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Image
              source={require('../../assets/fodai.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerName}>Fodco AI</Text>
              <Text style={styles.headerProductSub} numberOfLines={1}>
                {product.name}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeCircleBtn}
            onPress={handleClearChat}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={20} color="#1E1D25" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 10 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((item) => {
              const isUser = item.role === 'user';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.msgBubbleRow,
                    isUser ? styles.msgRowUser : styles.msgRowAi,
                  ]}
                >
                  {!isUser && (
                    <Image
                      source={require('../../assets/fodai.png')}
                      style={styles.msgAvatar}
                      resizeMode="contain"
                    />
                  )}
                  <View
                    style={[
                      styles.msgBubble,
                      isUser ? styles.msgBubbleUser : styles.msgBubbleAi,
                    ]}
                  >
                    {isUser ? (
                      <Text style={styles.msgTextUser} selectable>
                        {item.content}
                      </Text>
                    ) : (
                      <FormattedAiText content={item.content} />
                    )}
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.msgBubbleRow, styles.msgRowAi]}>
                <Image
                  source={require('../../assets/fodai.png')}
                  style={styles.msgAvatar}
                  resizeMode="contain"
                />
                <View style={[styles.msgBubble, styles.msgBubbleAi, styles.typingBubble]}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.typingText}>Analyzing...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.quickPromptsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsScroll}>
              {quickPrompts.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickPromptChip}
                  onPress={() => handleSend(prompt)}
                  disabled={loading}
                >
                  <Text style={styles.quickPromptText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.inputBar, { paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 12) }]}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              placeholder={`Ask Fodco AI about ${product.name}...`}
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                handleSend();
                textInputRef.current?.focus();
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() || loading ? styles.sendBtnDisabled : null,
              ]}
              onPress={() => {
                handleSend();
                textInputRef.current?.focus();
              }}
              disabled={!inputText.trim() || loading}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  closeCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginHorizontal: 10,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1D25',
  },
  headerProductSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    maxWidth: 220,
  },
  placeholderBtn: {
    width: 38,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  msgBubbleRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAi: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
  },
  msgBubble: {
    maxWidth: '86%',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 20,
  },
  msgBubbleUser: {
    backgroundColor: '#1E1D25',
    borderBottomRightRadius: 4,
  },
  msgBubbleAi: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF0F4',
    borderBottomLeftRadius: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  msgTextUser: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  typingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  quickPromptsRow: {
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
  },
  quickPromptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
  },
  quickPromptText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E1D25',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
