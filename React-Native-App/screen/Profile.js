import { View, Text, StyleSheet } from 'react-native';

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Screen</Text>
      <Text>User: Alice</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
