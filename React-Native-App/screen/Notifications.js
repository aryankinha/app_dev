import { View, Text, StyleSheet } from 'react-native';

export default function Notifications() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications Screen</Text>
      <Text>No new notifications</Text>
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
