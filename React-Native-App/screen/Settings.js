import { View, Text, StyleSheet } from 'react-native';

export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings Screen</Text>
      <Text>Preferences & Settings</Text>
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
