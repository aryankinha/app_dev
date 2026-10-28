import { Platform } from 'react-native';

// Single point configuration for the backend URL
export const API_BASE_URL = 'http://10.7.1.51:3000';

// On Web, use the local Metro proxy (/api-proxy) to bypass browser CORS restrictions
const BASE_URL = Platform.OS === 'web' ? '/api-proxy' : API_BASE_URL;

// Current active credentials (used in Authorization: Basic <username>:<password>)
let authUsername = 'aryan_dev';
let authPassword = 'password';

export function setCredentials(username, password = 'password') {
  authUsername = username;
  authPassword = password;
}

export function getCredentials() {
  return { username: authUsername, password: authPassword };
}

export function getAuthHeader() {
  return `Basic ${authUsername}:${authPassword}`;
}

async function request(endpoint, options = {}) {
  const headers = {
    'Authorization': getAuthHeader(),
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const errorMsg = data?.message || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // User APIs
  getProfile: (userId) => request(`/user/profile${userId ? `?user_id=${userId}` : ''}`),
  getUsers: async () => {
    const res = await request('/user');
    return Array.isArray(res) ? res : (res?.data || []);
  },

  // Conversation APIs
  getConversations: async () => {
    const res = await request('/conversation');
    return Array.isArray(res) ? res : (res?.data || []);
  },
  createConversation: (payload) => request('/conversation', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Message APIs
  getMessages: async (conversationId, cursor) => {
    const res = await request(`/message?conversation_id=${conversationId}${cursor ? `&from_message_cursor=${cursor}` : ''}`);
    return {
      data: Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []),
      nextCursor: res?.nextCursor || null,
      count: res?.count || 0,
    };
  },
  sendMessage: (conversationId, content) =>
    request('/message', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, content }),
    }),
};
