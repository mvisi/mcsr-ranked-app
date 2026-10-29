import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, FlatList, Keyboard, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SuggestionRow, usePlayerSuggestions } from '@/components/player-input';
import { IconButton, Input, QueryState, Txt } from '@/components/ui';

// Covers the screen it is rendered in, with results sliding up from where the leaderboard sits.
export function PlayerSearch({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const suggestions = usePlayerSuggestions(name);
  const trimmed = name.trim();
  const exact = suggestions.some(
    (player) => player.nickname.toLowerCase() === trimmed.toLowerCase(),
  );

  // Closing plays the opening in reverse. the search row fades first, then the
  // results slide back down while the background clears to show the leaderboard.
  const closing = useSharedValue(0);
  const close = useCallback(() => {
    if (closing.get() > 0) return;
    Keyboard.dismiss();
    closing.set(
      withTiming(
        1,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(onClose);
        },
      ),
    );
  }, [closing, onClose]);
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(24, 24, 27, ${interpolate(closing.value, [0.4, 1], [1, 0], 'clamp')})`,
  }));
  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(closing.value, [0, 0.5], [1, 0], 'clamp'),
  }));
  const resultsStyle = useAnimatedStyle(() => ({
    opacity: 1 - closing.value,
    transform: [{ translateY: closing.value * 160 }],
  }));

  // Only while focused, so back on a pushed player screen still leaves that screen.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          close();
          return true;
        },
      );
      return () => subscription.remove();
    }, [close]),
  );

  const open = (nickname: string) => {
    if (!nickname) return;
    Keyboard.dismiss();
    router.push({ pathname: '/player/[name]', params: { name: nickname } });
  };

  return (
    <Animated.View entering={FadeIn.duration(150)} className="absolute inset-0">
      <Animated.View style={[{ flex: 1 }, backgroundStyle]}>
        <Animated.View style={rowStyle} className="flex-row gap-2 p-4 pb-2">
          <IconButton label="Close search" icon="arrow-back" onPress={close} />
          <Input
            accessibilityLabel="Player name"
            placeholder="Search for players"
            autoFocus
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => open(trimmed)}
            returnKeyType="search"
            className="flex-1"
          />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(250).withInitialValues({
            transform: [{ translateY: 160 }],
          })}
          className="flex-1"
        >
          <Animated.View style={[{ flex: 1 }, resultsStyle]}>
            <FlatList
              data={suggestions}
              keyExtractor={(player) => player.uuid}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              renderItem={({ item }) => (
                <SuggestionRow player={item} onSelect={open} large />
              )}
              ListHeaderComponent={
                trimmed && !exact ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${trimmed}'s stats`}
                    onPress={() => open(trimmed)}
                    className="min-h-16 flex-row items-center gap-3 border-b border-zinc-800 px-4 py-3 active:bg-ranked-surface"
                  >
                    <Ionicons name="search" size={20} color="#a3d65c" />
                    <Txt numberOfLines={1} className="flex-1 text-sm">
                      {trimmed}
                    </Txt>
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                trimmed ? null : (
                  <QueryState empty="Type a player name to search." />
                )
              }
              ListFooterComponent={<View className="h-8" />}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
