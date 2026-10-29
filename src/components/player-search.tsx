import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Keyboard, Pressable, View } from 'react-native';

import { PlayerInput } from '@/components/player-input';

export function PlayerSearch({
  name,
  onChangeName,
}: {
  name: string;
  onChangeName: (name: string) => void;
}) {
  const open = (nickname: string) => {
    if (!nickname) return;
    Keyboard.dismiss();
    router.push({ pathname: '/player/[name]', params: { name: nickname } });
  };
  return (
    // Lifts the suggestions above the rest of the header.
    <View className="z-10 flex-row gap-2">
      <PlayerInput
        accessibilityLabel="Player name"
        placeholder="Search for players"
        value={name}
        onChangeText={onChangeName}
        onSelect={open}
        onSubmitEditing={() => open(name.trim())}
        returnKeyType="search"
        containerClassName="flex-1"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search player"
        disabled={!name.trim()}
        onPress={() => open(name.trim())}
        className="h-12 w-12 items-center justify-center rounded-md border border-ranked-border bg-ranked-surface active:bg-zinc-700 disabled:opacity-40"
      >
        <Ionicons name="search" color="#a3d65c" size={22} />
      </Pressable>
    </View>
  );
}
