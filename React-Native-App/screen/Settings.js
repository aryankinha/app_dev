import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../api';

export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Backend Base URL:</Text>
        <Text style={styles.url}>{API_BASE_URL}</Text>
        <Text style={styles.note}>
          Change the backend URL at a single point in `api.js` (export const API_BASE_URL = '...').
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Implemented APIs:</Text>
        <Text style={styles.item}>• GET /user/profile</Text>
        <Text style={styles.item}>• GET /user</Text>
        <Text style={styles.item}>• GET /conversation</Text>
        <Text style={styles.item}>• POST /conversation</Text>
        <Text style={styles.item}>• GET /message</Text>
        <Text style={styles.item}>• POST /message</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    padding: 14,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  url: {
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  item: {
    fontSize: 13,
    color: '#444',
  },
});
