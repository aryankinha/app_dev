import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { api } from '../api';

const AVATAR_COLORS = ['#00a884', '#128c7e', '#25d366', '#075e54', '#34b7f1', '#657786', '#e056fd', '#f0932b'];

function getAvatarColor(name) {
  const str = String(name || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  const str = String(name || '').trim();
  if (!str) return '?';
  const parts = str.split(/[\s.@_-]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatList({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Map of conversationId -> { content, createdAt, senderId }
  const [lastMessages, setLastMessages] = useState({});

  // Selected chat state
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);

  // Load profile, conversations, users, and their latest messages
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [profile, convos, allUsers] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getConversations().catch(() => []),
        api.getUsers().catch(() => []),
      ]);

      const safeProfile = profile || null;
      const safeConvos = Array.isArray(convos) ? convos : [];
      const safeUsers = Array.isArray(allUsers) ? allUsers : [];

      setCurrentProfile(safeProfile);
      setConversations(safeConvos);
      setUsers(safeUsers);

      // Preload latest message for each conversation to show preview and sort properly
      const lastMsgMap = {};
      await Promise.all(
        safeConvos.map(async (c) => {
          try {
            const res = await api.getMessages(c.id);
            const msgList = res?.data || [];
            if (msgList.length > 0) {
              lastMsgMap[c.id] = msgList[msgList.length - 1];
            }
          } catch {}
        })
      );
      setLastMessages((prev) => ({ ...prev, ...lastMsgMap }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Poll for messages in the selected chat every 4 seconds for a real-time experience
  useEffect(() => {
    if (!selectedChat?.id) return;

    let isMounted = true;
    const fetchChatMessages = async (silent = false) => {
      if (!silent) setLoadingMessages(true);
      try {
        const res = await api.getMessages(selectedChat.id);
        if (isMounted) {
          const newMessages = res?.data || [];
          setMessages((prev) => {
            // Only update if count or IDs changed to avoid unnecessary re-renders
            if (prev.length !== newMessages.length) {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
              return newMessages;
            }
            return prev;
          });

          if (newMessages.length > 0) {
            const latest = newMessages[newMessages.length - 1];
            setLastMessages((prev) => ({ ...prev, [selectedChat.id]: latest }));
          }
        }
      } catch (err) {
        if (isMounted && !silent) setMessages([]);
      } finally {
        if (isMounted && !silent) setLoadingMessages(false);
      }
    };

    fetchChatMessages(false);
    const interval = setInterval(() => fetchChatMessages(true), 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedChat?.id]);

  const getConversationTitle = (convo) => {
    if (convo?.name) return convo.name;
    const otherId = convo?.participants_ids?.find(
      (id) => id !== currentProfile?.id
    );
    const otherUser = users.find((u) => u.id === otherId);
    return otherUser ? otherUser.name : `Chat (${convo?.type || 'DM'})`;
  };

  const handleSelectConversation = (chat) => {
    const title = getConversationTitle(chat);
    setSelectedChat({ ...chat, id: chat.id, name: title });
  };

  const handleSelectUser = async (user) => {
    try {
      setLoading(true);
      const convo = await api.createConversation({ recipient_id: user.id });
      setSelectedChat({ ...convo, id: convo.id, name: user.name || 'Chat' });

      // Refresh conversations list
      const updatedConvos = await api.getConversations();
      setConversations(Array.isArray(updatedConvos) ? updatedConvos : []);
    } catch (err) {
      alert(`Could not start chat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedChat?.id || sending) return;
    const text = inputMessage.trim();
    setInputMessage('');
    try {
      setSending(true);
      const sent = await api.sendMessage(selectedChat.id, text);

      // Append to active message list immediately
      setMessages((prev) => [...prev, sent]);

      // Update latest message in chat list and move conversation to top
      setLastMessages((prev) => ({
        ...prev,
        [selectedChat.id]: sent,
      }));

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Sort conversations by latest message / activity at the top
  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = new Date(lastMessages[a.id]?.createdAt || a.createdAt).getTime();
    const timeB = new Date(lastMessages[b.id]?.createdAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  const query = search.trim().toLowerCase();

  const filteredConversations = sortedConversations.filter((c) => {
    const title = getConversationTitle(c).toLowerCase();
    const lastText = (lastMessages[c.id]?.content || '').toLowerCase();
    return title.includes(query) || lastText.includes(query);
  });

  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentProfile?.id &&
      (u.name?.toLowerCase().includes(query) || u.bio?.toLowerCase().includes(query))
  );

  // Left sidebar pane (Chat List & Contacts)
  const renderSidebar = () => (
    <View style={[styles.sidebar, isMobile && selectedChat ? styles.hidden : null]}>
      {/* Header with profile info and refresh */}
      <View style={styles.sidebarHeader}>
        <View style={styles.userProfileRow}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: getAvatarColor(currentProfile?.name) },
            ]}
          >
            <Text style={styles.avatarText}>
              {getInitials(currentProfile?.name)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.myUserName} numberOfLines={1}>
              {currentProfile?.name || 'My Account'}
            </Text>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.iconButton} onPress={loadInitialData}>
          <Text style={styles.iconButtonText}>↻</Text>
        </Pressable>
      </View>

      {/* WhatsApp / Telegram Styled Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search or start new chat"
            placeholderTextColor="#8696a0"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.chatListScroll}>
        {loading && <ActivityIndicator style={{ marginVertical: 12 }} size="small" color="#00a884" />}

        {/* Existing Conversations with Latest Message at Top */}
        <Text style={styles.sectionHeader}>CHATS</Text>
        {filteredConversations.length > 0 ? (
          filteredConversations.map((chat) => {
            const title = getConversationTitle(chat);
            const isSelected = selectedChat?.id === chat.id;
            const lastMsg = lastMessages[chat.id];
            const timeLabel = formatTime(lastMsg?.createdAt || chat.createdAt);
            const snippet = lastMsg
              ? (lastMsg.senderId === currentProfile?.id ? 'You: ' : '') + lastMsg.content
              : (chat.type === 'DM' ? 'Direct Message' : 'Group Chat');

            return (
              <Pressable
                key={chat.id}
                style={[styles.chatItem, isSelected && styles.chatItemSelected]}
                onPress={() => handleSelectConversation(chat)}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(title) },
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(title)}</Text>
                </View>
                <View style={styles.chatItemBody}>
                  <View style={styles.chatItemRow}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={[styles.chatTime, isSelected && styles.chatTimeActive]}>
                      {timeLabel}
                    </Text>
                  </View>
                  <Text style={styles.chatSubtitle} numberOfLines={1}>
                    {snippet}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          !loading && <Text style={styles.emptyNote}>No conversations found.</Text>
        )}

        {/* Contacts to start chatting with */}
        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>START NEW CONVERSATION</Text>
        {filteredUsers.map((user) => (
          <Pressable
            key={user.id}
            style={styles.chatItem}
            onPress={() => handleSelectUser(user)}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: getAvatarColor(user.name) },
              ]}
            >
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
            <View style={styles.chatItemBody}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.chatSubtitle} numberOfLines={1}>
                {user.bio || 'Tap to start chat'}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // Right main pane (Active Conversation)
  const renderChatArea = () => {
    if (!selectedChat) {
      if (isMobile) return null;
      return (
        <View style={styles.emptyChatArea}>
          <Text style={styles.emptyChatLogo}>💬</Text>
          <Text style={styles.emptyChatTitle}>WhatsApp / Telegram Web</Text>
          <Text style={styles.emptyChatSubtitle}>
            Select a conversation on the left to start messaging. Send messages seamlessly in real time.
          </Text>
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>🔒 End-to-end encrypted messaging</Text>
          </View>
        </View>
      );
    }

    const chatDisplayName = selectedChat?.name || 'Chat';

    return (
      <View style={[styles.chatArea, isMobile && !selectedChat ? styles.hidden : null]}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          {isMobile && (
            <Pressable
              onPress={() => setSelectedChat(null)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
          )}
          <View
            style={[
              styles.avatar,
              { backgroundColor: getAvatarColor(chatDisplayName), marginRight: 12 },
            ]}
          >
            <Text style={styles.avatarText}>
              {getInitials(chatDisplayName)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {chatDisplayName}
            </Text>
            <Text style={styles.chatHeaderStatus}>
              {selectedChat.type === 'GROUP' ? 'Group conversation' : 'online'}
            </Text>
          </View>
        </View>

        {/* Messages List with auto-scroll */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {loadingMessages ? (
            <ActivityIndicator style={{ marginTop: 24 }} size="small" color="#00a884" />
          ) : messages.length === 0 ? (
            <View style={styles.noMessagesContainer}>
              <Text style={styles.noMessagesText}>No messages yet. Send a greeting to start!</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentProfile?.id;
              const timeStr = formatTime(msg.createdAt);

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    isMine ? styles.myBubble : styles.theirBubble,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.content}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.messageTime}>{timeStr}</Text>
                    {isMine && <Text style={styles.checkMark}>✓✓</Text>}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Message Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#8696a0"
            value={inputMessage}
            onChangeText={setInputMessage}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <Pressable
            style={[
              styles.sendButton,
              !inputMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputMessage.trim() || sending}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {renderSidebar()}
      {renderChatArea()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  hidden: {
    display: 'none',
  },

  // Sidebar styles (Left)
  sidebar: {
    width: 360,
    borderRightWidth: 1,
    borderRightColor: '#e9edef',
    backgroundColor: '#ffffff',
    flexDirection: 'column',
  },
  sidebarHeader: {
    height: 64,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  myUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111b21',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00a884',
  },
  statusText: {
    fontSize: 12,
    color: '#00a884',
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e9edef',
  },
  iconButtonText: {
    fontSize: 18,
    color: '#54656f',
    fontWeight: 'bold',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111b21',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#8696a0',
  },

  chatListScroll: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00a884',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    letterSpacing: 0.6,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f2f5',
  },
  chatItemSelected: {
    backgroundColor: '#f0f2f5',
  },
  chatItemBody: {
    marginLeft: 12,
    flex: 1,
  },
  chatItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111b21',
    flex: 1,
    marginRight: 6,
  },
  chatTime: {
    fontSize: 11,
    color: '#8696a0',
  },
  chatTimeActive: {
    color: '#00a884',
    fontWeight: '600',
  },
  chatSubtitle: {
    fontSize: 13,
    color: '#667781',
    marginTop: 3,
  },
  emptyNote: {
    padding: 16,
    color: '#8696a0',
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Avatars
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Chat Area styles (Right)
  chatArea: {
    flex: 1,
    backgroundColor: '#efeae2',
    flexDirection: 'column',
  },
  emptyChatArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyChatLogo: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#41525d',
    marginBottom: 8,
  },
  emptyChatSubtitle: {
    fontSize: 14,
    color: '#667781',
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  lockBadge: {
    marginTop: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9edef',
    borderRadius: 16,
  },
  lockText: {
    fontSize: 12,
    color: '#8696a0',
  },
  chatHeader: {
    height: 64,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d7db',
  },
  backButton: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 26,
    color: '#00a884',
    fontWeight: '600',
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111b21',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#00a884',
    marginTop: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 8,
  },
  noMessagesContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  noMessagesText: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 13,
    color: '#54656f',
    elevation: 1,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 8,
    elevation: 1,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#d9fdd3',
    borderTopRightRadius: 0,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 14.5,
    color: '#111b21',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#667781',
  },
  checkMark: {
    fontSize: 11,
    color: '#53bdeb',
    fontWeight: 'bold',
  },
  inputContainer: {
    minHeight: 64,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#d1d7db',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111b21',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#a6d9ce',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 2,
  },
});
