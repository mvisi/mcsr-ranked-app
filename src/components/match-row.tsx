import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { Match } from 'mcsrranked-sdk';
import { Pressable, View } from 'react-native';

import { Avatar, Button, QueryState, Txt } from '@/components/ui';
import { dateTime, duration } from '@/lib/format';
import { outcome, signed } from '@/lib/matches';

export function MatchRow({ match, viewer }: { match: Match; viewer?: string }) {
  const opponent = match.players.find((player) => player.uuid !== viewer);
  const result = outcome(match, viewer);
  const change = match.changes.find((entry) => entry.uuid === viewer);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: match.decayed }}
      accessibilityLabel={`${opponent?.nickname ?? 'Match'}, ${result.title}, ${match.forfeited ? 'forfeit' : duration(match.result.time)}`}
      disabled={match.decayed}
      onPress={() =>
        router.push({ pathname: '/match/[id]', params: { id: match.id } })
      }
      className="min-h-20 flex-row items-center gap-3 border-b border-zinc-800 px-4 py-3 active:bg-ranked-surface"
    >
      {opponent && <Avatar uuid={opponent.uuid} />}
      <View className="flex-1 gap-2">
        <Txt className="text-sm" numberOfLines={1}>
          {match.decayed
            ? 'Rank decay'
            : viewer
              ? `vs ${opponent?.nickname ?? 'Unknown'}`
              : match.players.map((player) => player.nickname).join(' vs ')}
        </Txt>
        <Txt className="text-xs text-zinc-500">{dateTime(match.date)}</Txt>
      </View>
      <View className="items-end gap-2">
        <Txt className="text-xs" style={{ color: result.color }}>
          {result.title}
          {change ? ` · ${signed(change.change)}` : ''}
        </Txt>
        <Txt className="text-sm">
          {match.decayed
            ? '–'
            : match.forfeited
              ? 'Forfeit'
              : match.result.uuid
                ? duration(match.result.time)
                : '–'}
        </Txt>
      </View>
      {!match.decayed && (
        <Ionicons name="chevron-forward" size={14} color="#71717a" />
      )}
    </Pressable>
  );
}

export function MatchesFooter({
  hasMore,
  loading,
  error,
  load,
  count,
}: {
  hasMore: boolean;
  loading: boolean;
  error: unknown;
  load: () => void;
  count: number;
}) {
  return (
    <View className="gap-4 p-4 pb-8">
      {error && count > 0 ? <QueryState error={error} retry={load} /> : null}
      {hasMore && !error && (
        <Button
          title={loading ? 'Loading…' : 'Load more matches'}
          disabled={loading}
          secondary
          onPress={load}
        />
      )}
      {count > 0 && (
        <Txt className="text-center text-xs text-zinc-500">
          {count} matches loaded{hasMore ? '' : ' · All matches shown'}
        </Txt>
      )}
    </View>
  );
}
