import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api, getCredentials, setCredentials } from '../api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const creds = getCredentials();
  const [username, setUsername] = useState(creds.username);
  const [password, setPassword] = useState(creds.password);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveCredentials = () => {
    setCredentials(username, password);
    loadProfile();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {loading && <ActivityIndicator size="small" color="#007AFF" />}
      {error && <Text style={styles.errorText}>Error: {error}</Text>}

      {profile && (
        <View style={styles.card}>
          <Text style={styles.label}>ID: <Text style={styles.val}>{profile.id}</Text></Text>
          <Text style={styles.label}>Name: <Text style={styles.val}>{profile.name}</Text></Text>
          <Text style={styles.label}>Bio: <Text style={styles.val}>{profile.bio || 'None'}</Text></Text>
        </View>
      )}

      <Text style={[styles.title, { marginTop: 24 }]}>Switch User / Auth</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable style={styles.button} onPress={handleSaveCredentials}>
        <Text style={styles.buttonText}>Save & Log In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    gap: 10,
  },
  title: {
    fontSize: 18,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  val: {
    fontWeight: 'normal',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
  },
});
