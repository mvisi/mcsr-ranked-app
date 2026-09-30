import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Avatar, Card, Heading, QueryState, Stat, Txt } from '@/components/ui';
import { ranked } from '@/lib/api';
import { duration, flag, percentage, rankTier } from '@/lib/format';
import { SeasonSelect, useSeason } from '@/lib/season';

export default function PlayerScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { season, current } = useSeason();
  const player = useQuery({
    queryKey: ['player', name, season],
    queryFn: () => ranked.users.get(name, { season }),
    enabled: !!name && season != null,
  });
  const user = player.data;
  const stats = user?.statistics.season;
  const total = user?.statistics.total;
  const rank = rankTier(user?.eloRate);
  const error = current.error ?? player.error;
  const refresh = () => {
    void current.refetch();
    void player.refetch();
  };

  return (
    <>
      <Stack.Screen options={{ title: user?.nickname ?? name ?? 'Player' }} />
      <ScrollView
        className="flex-1 bg-ranked-background"
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={player.isRefetching}
            onRefresh={refresh}
            colors={['#70a822']}
            tintColor="#a3d65c"
          />
        }
      >
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
                    {user.eloRank ?? '–'}
                  </Txt>
                  <Txt style={{ color: rank.color }}>
                    {rank.name} · {user.eloRate ?? '–'} Elo
                  </Txt>
                </View>
              </View>
              <Txt className="text-xs text-ranked-muted">
                Peak Elo {user.seasonResult.highest ?? '–'} ·{' '}
                {user.seasonResult.last?.phasePoint ?? 0} phase points
              </Txt>
            </Card>
            <Card>
              <Heading>Season {season}</Heading>
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
          </>
        )}
      </ScrollView>
    </>
  );
}
