import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';

import ChatList from './screen/ChatList';
import Conversation from './screen/Conversation';
import Profile from './screen/Profile';
import Notifications from './screen/Notifications';
import Settings from './screen/Settings';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatList}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Conversation"
        component={Conversation}
      />
    </Stack.Navigator>
  );
}

function BottomTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="ChatsTab"
        component={ChatStack}
        options={{ title: 'Chats' }}
      />
      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="Notifications" component={Notifications} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Home">
        <Drawer.Screen name="Home" component={BottomTabs} />
        <Drawer.Screen name="Settings" component={Settings} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
