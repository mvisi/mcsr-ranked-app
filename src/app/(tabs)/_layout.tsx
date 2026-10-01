import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#a3d65c',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarStyle: { backgroundColor: '#27272a', borderTopColor: '#3f3f46' },
        tabBarLabelStyle: { fontFamily: 'Minecraft', fontSize: 12 },
        sceneStyle: { backgroundColor: '#18181b' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="podium-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="weekly-race"
        options={{
          title: 'Weekly race',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="playoffs"
        options={{
          title: 'Playoffs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
