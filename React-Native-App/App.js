import { Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider
      initialMetrics={{
        insets: {
          top: 100,
          left: 100,
          bottom: 100,
          right: 100,
        },
      }}
      style={{
        backgroundColor: 'red',
      }}
    >
      <SafeAreaView
        mode="margin"
        style={{
          backgroundColor: 'green',
          flex: 1,
        }}
      >
        <Text>Hello</Text>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
