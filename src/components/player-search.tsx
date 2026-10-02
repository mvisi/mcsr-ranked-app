import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Keyboard, Pressable, View } from 'react-native';

import { Input } from '@/components/ui';

export function PlayerSearch({
  name,
  onChangeName,
}: {
  name: string;
  onChangeName: (name: string) => void;
}) {
  const search = () => {
    if (!name.trim()) return;
    Keyboard.dismiss();
    router.push({ pathname: '/player/[name]', params: { name: name.trim() } });
  };
  return (
    <View className="flex-row gap-2">
      <Input
        accessibilityLabel="Player name"
        placeholder="Search for players"
        value={name}
        onChangeText={onChangeName}
        onSubmitEditing={search}
        returnKeyType="search"
        className="flex-1"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search player"
        disabled={!name.trim()}
        onPress={search}
        className="h-12 w-12 items-center justify-center rounded-md border border-ranked-border bg-ranked-surface active:bg-zinc-700 disabled:opacity-40"
      >
        <Ionicons name="search" color="#a3d65c" size={22} />
      </Pressable>
    </View>
  );
}
