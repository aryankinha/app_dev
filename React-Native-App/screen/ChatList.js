import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function ChatList({ route, navigation }) {
  const chats = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ];

  return (
    <View style={styles.container}>
      <Text>Chats</Text>

      {chats.map((chat) => (
        <Pressable
          key={chat.id}
          style={styles.item}
          onPress={() =>
            navigation.navigate('Conversation', { userName: chat.name })
          }
        >
          <Text>{chat.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 12,
  },
  item: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#e3e3e3',
  },
});
