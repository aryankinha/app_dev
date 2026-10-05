import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function Conversation({ route, navigation }) {
  const { userName } = route.params;

  return (
    <View style={styles.container}>
      <Text>Conversation with {userName}</Text>
      <Text>route.params: {JSON.stringify(route.params)}</Text>

      <Pressable style={styles.button} onPress={() => navigation.goBack()}>
        <Text>Go Back to ChatList</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    backgroundColor: '#d6d6d6',
    padding: 100,
  },
});
