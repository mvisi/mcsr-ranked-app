import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
} from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  View,
  type TextInput,
} from 'react-native';

import { Avatar, Input, Txt } from '@/components/ui';
import { removeRecentPlayer, useRecentPlayers } from '@/lib/recent-players';
import { useCurrentLeaderboard } from '@/lib/season';

export type Suggestion = {
  uuid: string;
  nickname: string;
  recent: boolean;
  rank?: number;
};

// Recent players first, then current leaderboard players once a name is being typed.
export function usePlayerSuggestions(text: string, limit?: number) {
  const recent = useRecentPlayers();
  const leaderboard = useCurrentLeaderboard();
  const query = text.trim().toLowerCase();
  return useMemo(() => {
    const matches = (nickname: string) =>
      nickname.toLowerCase().includes(query);
    const recentIds = new Set(recent.map((player) => player.uuid));
    const list: Suggestion[] = [
      ...recent
        .filter((player) => matches(player.nickname))
        .map((player) => ({ ...player, recent: true })),
      ...(query ? (leaderboard.data?.users ?? []) : [])
        .filter(
          (player) => !recentIds.has(player.uuid) && matches(player.nickname),
        )
        .map((player) => ({
          uuid: player.uuid,
          nickname: player.nickname,
          recent: false,
          rank: player.seasonResult.eloRank,
        })),
    ];
    return list.slice(0, limit);
  }, [query, recent, leaderboard.data, limit]);
}

export function SuggestionRow({
  player,
  onSelect,
  large,
}: {
  player: Suggestion;
  onSelect: (nickname: string) => void;
  large?: boolean;
}) {
  return (
    <View className="flex-row items-center border-b border-zinc-800">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${player.nickname}`}
        onPress={() => onSelect(player.nickname)}
        className={
          large
            ? 'min-h-16 flex-1 flex-row items-center gap-3 px-4 py-3 active:bg-ranked-surface'
            : 'min-h-12 flex-1 flex-row items-center gap-3 px-3 py-2 active:bg-zinc-700'
        }
      >
        <Avatar uuid={player.uuid} size={large ? 32 : 24} />
        <Txt numberOfLines={1} className="flex-1 text-sm">
          {player.nickname}
        </Txt>
        {player.recent ? (
          <Ionicons name="time-outline" size={14} color="#71717a" />
        ) : (
          <Txt className="text-xs text-zinc-500">#{player.rank}</Txt>
        )}
      </Pressable>
      {player.recent && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${player.nickname} from recent players`}
          onPress={() => removeRecentPlayer(player.uuid)}
          className="h-12 w-12 items-center justify-center active:opacity-70"
        >
          <Ionicons name="close" size={18} color="#71717a" />
        </Pressable>
      )}
    </View>
  );
}

export function PlayerInput({
  value,
  onChangeText,
  onSelect,
  containerClassName,
  onFocus,
  onBlur,
  ref,
  ...props
}: ComponentPropsWithRef<typeof Input> & {
  value: string;
  onChangeText: (name: string) => void;
  onSelect: (nickname: string) => void;
  containerClassName?: string;
}) {
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  useEffect(() => {
    if (!focused) return;
    const subscription = Keyboard.addListener('keyboardDidHide', () =>
      input.current?.blur(),
    );
    return () => subscription.remove();
  }, [focused]);
  const suggestions = usePlayerSuggestions(value, 4);
  const open = focused && suggestions.length > 0;

  return (
    <View className={containerClassName}>
      <Input
        {...props}
        ref={(node) => {
          input.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {open && (
        <View
          className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-hidden rounded-md border border-ranked-border bg-ranked-surface"
          style={{ elevation: 8 }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map((player) => (
              <SuggestionRow
                key={player.uuid}
                player={player}
                onSelect={onSelect}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
