import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { MatchSort } from 'mcsrranked-sdk';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  Button,
  Card,
  Heading,
  QueryState,
  Select,
  Stat,
  Txt,
} from '@/components/ui';
import { EloChart } from '@/components/elo-chart';
import { MatchRow, MatchesFooter } from '@/components/match-row';
import { uniqueMatches, useMatches } from '@/lib/matches';
import { ranked } from '@/lib/api';
import { duration, flag, percentage, rankTier } from '@/lib/format';
import { SeasonSelect, useSeason } from '@/lib/season';

export default function PlayerScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { season, current, setSelected } = useSeason();
  const [type, setType] = useState('2');
  const [sort, setSort] = useState<MatchSort>('newest');
  const [showSeasons, setShowSeasons] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const matches = useMatches({ name, season, type: Number(type), sort });
  const rows = uniqueMatches(matches.data?.pages);
  const seasons = useQuery({
    queryKey: ['player-seasons', name],
    queryFn: () => ranked.users.seasons(name),
    enabled: showSeasons && !!name,
  });
  const player = useQuery({
    queryKey: ['player', name, season],
    queryFn: () => ranked.users.get(name, { season }),
    enabled: !!name && season != null,
  });
  const user = player.data;
  const stats = user?.statistics.season;
  const total = user?.statistics.total;
  const displayElo =
    user?.seasonResult.last?.eloRate ??
    (season === current.data?.season.number ? user?.eloRate : null);
  const displayRank =
    user?.seasonResult.last?.eloRank ??
    (season === current.data?.season.number ? user?.eloRank : null);
  const rank = rankTier(displayElo);
  const error = current.error ?? player.error;
  const refresh = () => {
    void current.refetch();
    void player.refetch();
    void matches.refetch();
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
      <Stack.Screen options={{ title: user?.nickname ?? name ?? 'Player' }} />
      <FlatList
        data={user && !error ? rows : []}
        keyExtractor={(match) => String(match.id)}
        refreshControl={
          <RefreshControl
            refreshing={player.isRefetching || matches.isRefetching}
            onRefresh={refresh}
            colors={['#70a822']}
            tintColor="#a3d65c"
          />
        }
        renderItem={({ item }) => <MatchRow match={item} viewer={user?.uuid} />}
        ListHeaderComponent={
          <View className="gap-4 p-4">
            <SeasonSelect />
            {error || !user ? (
              <QueryState pending={!error} error={error} retry={refresh} />
            ) : (
              <>
                <Card className="gap-4">
                  <View className="flex-row items-center gap-4">
                    <Avatar uuid={user.uuid} size={64} />
                    <View className="flex-1 gap-2">
                      <Txt className="text-xl" numberOfLines={1}>
                        {user.nickname}
                      </Txt>
                      <Txt className="text-xs text-ranked-muted">
                        {flag(user.country)}{' '}
                        {user.country?.toUpperCase() ?? 'World'} · #
                        {displayRank ?? '–'}
                      </Txt>
                      <Txt style={{ color: rank.color }}>
                        {rank.name} · {displayElo ?? '–'} Elo
                      </Txt>
                    </View>
                  </View>
                  <Txt className="text-xs text-ranked-muted">
                    Peak Elo {user.seasonResult.highest ?? '–'} ·{' '}
                    {user.seasonResult.last?.phasePoint ?? 0} phase points
                  </Txt>
                </Card>
                <Card>
                  <Heading>Season {season} · Ranked</Heading>
                  <View className="flex-row flex-wrap gap-6">
                    <Stat
                      title="Win rate"
                      value={percentage(
                        stats?.wins.ranked ?? null,
                        stats?.playedMatches.ranked ?? null,
                      )}
                    />
                    <Stat
                      title="Personal best"
                      value={duration(stats?.bestTime.ranked)}
                    />
                    <Stat title="Wins" value={stats?.wins.ranked ?? '–'} />
                    <Stat title="Losses" value={stats?.loses.ranked ?? '–'} />
                    <Stat
                      title="Completions"
                      value={stats?.completions.ranked ?? '–'}
                    />
                    <Stat
                      title="Average completion"
                      value={
                        stats?.completions.ranked
                          ? duration(
                              (stats.completionTime.ranked ?? 0) /
                                stats.completions.ranked,
                            )
                          : '–'
                      }
                    />
                    <Stat
                      title="Best win streak"
                      value={stats?.highestWinStreak.ranked ?? '–'}
                    />
                    <Stat
                      title="Forfeit rate"
                      value={percentage(
                        stats?.forfeits.ranked ?? null,
                        stats?.playedMatches.ranked ?? null,
                      )}
                    />
                  </View>
                </Card>
                <Card>
                  <Heading>All time</Heading>
                  <View className="flex-row flex-wrap gap-6">
                    <Stat
                      title="Personal best"
                      value={duration(total?.bestTime.ranked)}
                    />
                    <Stat
                      title="Best win streak"
                      value={total?.highestWinStreak.ranked ?? '–'}
                    />
                    <Stat title="Wins" value={total?.wins.ranked ?? '–'} />
                    <Stat
                      title="Completions"
                      value={total?.completions.ranked ?? '–'}
                    />
                  </View>
                </Card>
                <Button
                  secondary
                  title={
                    showAchievements
                      ? 'Hide achievements'
                      : `Achievements · ${user.achievements.total.length + user.achievements.display.length}`
                  }
                  onPress={() => setShowAchievements(!showAchievements)}
                />
                {showAchievements && (
                  <Card className="gap-4">
                    <Heading>Achievements</Heading>
                    {[
                      ...user.achievements.display,
                      ...user.achievements.total,
                    ].map((achievement, index) => (
                      <View
                        key={`${achievement.id}-${index}`}
                        className="gap-2"
                      >
                        <Txt className="text-sm">
                          {achievement.id.replace(/([A-Z])/g, ' $1')} · Level{' '}
                          {achievement.level}
                        </Txt>
                        <Txt className="text-xs text-ranked-muted">
                          {achievement.data.join(' · ')}
                          {achievement.value != null
                            ? ` · ${achievement.value}${achievement.goal != null ? ` / ${achievement.goal}` : ''}`
                            : ''}
                        </Txt>
                      </View>
                    ))}
                  </Card>
                )}
                <Button
                  secondary
                  title={showSeasons ? 'Hide season history' : 'Season history'}
                  onPress={() => setShowSeasons(!showSeasons)}
                />
                {showSeasons && (
                  <Card className="gap-2">
                    <Heading>Previous seasons</Heading>
                    <QueryState
                      pending={seasons.isPending}
                      error={seasons.error}
                      retry={() => {
                        void seasons.refetch();
                      }}
                    />
                    {Object.entries(seasons.data?.seasonResults ?? {})
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([number, result]) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`View season ${number}`}
                          key={number}
                          onPress={() => setSelected(Number(number))}
                          className="min-h-12 flex-row justify-between border-b border-zinc-700 py-3"
                        >
                          <Txt className="text-sm">
                            Season {number} · #{result.last?.eloRank ?? '–'}
                          </Txt>
                          <Txt className="text-sm text-lime-300">
                            {result.last?.eloRate ?? '–'} Elo
                          </Txt>
                        </Pressable>
                      ))}
                  </Card>
                )}
                {type === '2' && sort === 'newest' && (
                  <EloChart matches={rows} uuid={user.uuid} />
                )}
                <Heading>Matches</Heading>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Select
                      title="Match type"
                      value={type}
                      onChange={(value) => {
                        setType(value);
                        setSort('newest');
                      }}
                      options={[
                        { label: 'Ranked', value: '2' },
                        { label: 'Casual', value: '1' },
                        { label: 'Private', value: '3' },
                        { label: 'Event', value: '4' },
                      ]}
                    />
                  </View>
                  <View className="flex-1">
                    <Select
                      title="Match order"
                      value={sort}
                      onChange={(value) => setSort(value as MatchSort)}
                      options={[
                        { label: 'Newest', value: 'newest' },
                        { label: 'Oldest', value: 'oldest' },
                        ...(type === '2'
                          ? [
                              { label: 'Fastest', value: 'fastest' },
                              { label: 'Slowest', value: 'slowest' },
                            ]
                          : []),
                      ]}
                    />
                  </View>
                </View>
                {type === '2' && (
                  <Txt className="text-xs text-ranked-muted">
                    {stats?.playedMatches.ranked ?? 0} matches ·{' '}
                    {stats?.wins.ranked ?? 0}W {stats?.loses.ranked ?? 0}L
                    {user.timestamp.nextDecay &&
                    season === current.data?.season.number
                      ? ` · Decay in ${Math.max(0, Math.ceil((user.timestamp.nextDecay - Date.now() / 1000) / 3600))}h`
                      : ''}
                  </Txt>
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          user && !error ? (
            <QueryState
              pending={matches.isPending}
              error={matches.error}
              retry={() => {
                void matches.refetch();
              }}
              empty={
                !matches.isPending && !matches.error
                  ? 'No matches for this type and season.'
                  : undefined
              }
            />
          ) : null
        }
        ListFooterComponent={
          user && !error ? (
            <MatchesFooter
              hasMore={matches.hasNextPage}
              loading={matches.isFetchingNextPage}
              error={matches.isFetchNextPageError ? matches.error : null}
              load={() => {
                void matches.fetchNextPage();
              }}
              count={rows.length}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
