import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { Match } from 'mcsrranked-sdk';
import { Pressable, View } from 'react-native';

import { Avatar, Button, QueryState, Txt } from '@/components/ui';
import { duration, matchDate } from '@/lib/format';
import { outcome, signed } from '@/lib/matches';

export function MatchRow({ match, viewer }: { match: Match; viewer?: string }) {
  const opponent = match.players.find((player) => player.uuid !== viewer);
  const singleplayer = match.players.length === 1;
  const avatar = singleplayer ? match.players[0] : opponent;
  const title = match.decayed
    ? 'Rank decay'
    : singleplayer
      ? 'Singleplayer'
      : viewer
        ? `vs ${opponent?.nickname ?? 'Unknown'}`
        : match.players
            .slice(0, 2)
            .map((player) => player.nickname)
            .join(' vs ');
  const others = match.players.length - 2;
  const othersLabel =
    !match.decayed && others > 0
      ? `(+${others} ${others === 1 ? 'other' : 'others'})`
      : '';
  const result = outcome(match, viewer);
  const change = match.changes.find((entry) => entry.uuid === viewer);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: match.decayed }}
      accessibilityLabel={`${title} ${othersLabel}, ${result.title}, ${match.forfeited ? 'forfeit' : duration(match.result.time)}`}
      disabled={match.decayed}
      onPress={() =>
        router.push({
          pathname: '/match/[id]',
          params: { id: match.id, ...(viewer ? { viewer } : {}) },
        })
      }
      className="min-h-20 flex-row items-center gap-3 border-b border-zinc-800 px-4 py-3 active:bg-ranked-surface"
    >
      {avatar && <Avatar uuid={avatar.uuid} />}
      <View className="min-w-0 flex-1 gap-2">
        <View className="flex-row items-center gap-1">
          <Txt
            className={`shrink text-sm ${singleplayer && !match.decayed ? 'text-ranked-muted' : ''}`}
            numberOfLines={1}
          >
            {title}
          </Txt>
          {!!othersLabel && <Txt className="text-sm">{othersLabel}</Txt>}
        </View>
        <Txt className="text-xs text-zinc-500">{matchDate(match.date)}</Txt>
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
