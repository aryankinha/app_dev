import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '../api';

export default function Conversation({ route, navigation }) {
  const { conversationId, name } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMessages(conversationId);
      setMessages(res?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    try {
      setSending(true);
      const sent = await api.sendMessage(conversationId, content);
      setMessages((prev) => [...prev, sent]);
    } catch (err) {
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{name || 'Conversation'}</Text>
        <Pressable onPress={loadMessages} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="small" color="#007AFF" />
      ) : (
        <ScrollView style={styles.messageList} contentContainerStyle={styles.messageContent}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages yet. Send a greeting!</Text>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={styles.bubble}>
                <Text style={styles.msgText}>{msg.content}</Text>
                <Text style={styles.msgTime}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type message..."
          value={input}
          onChangeText={setInput}
        />
        <Pressable style={styles.sendBtn} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshBtn: {
    padding: 6,
  },
  refreshText: {
    fontSize: 16,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontStyle: 'italic',
  },
  bubble: {
    backgroundColor: '#e9e9eb',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  msgText: {
    fontSize: 15,
  },
  msgTime: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    padding: 8,
    textAlign: 'center',
  },
});
