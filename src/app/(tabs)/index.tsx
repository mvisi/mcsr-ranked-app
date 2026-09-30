import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerSearch } from '@/components/player-search';
import { PlayerRow, QueryState, Segments, Select, Txt } from '@/components/ui';
import { ranked } from '@/lib/api';
import { dateTime, duration, flag } from '@/lib/format';
import { SeasonSelect, useSeason } from '@/lib/season';

type Board = 'elo' | 'records' | 'points';
type Row = {
  key: string;
  position: number;
  player: {
    uuid: string;
    nickname: string;
    country: string | null;
    eloRate: number | null;
  };
  value: string;
  detail?: string;
  matchId?: number;
};

export default function StatsScreen() {
  const { season, current } = useSeason();
  const [board, setBoard] = useState<Board>('elo');
  const [country, setCountry] = useState('world');
  const [allTime, setAllTime] = useState(false);
  const [distinct, setDistinct] = useState(true);
  const [predicted, setPredicted] = useState(false);
  const elo = useQuery({
    queryKey: ['leaderboard', season, country],
    queryFn: () =>
      ranked.leaderboards.elo({
        season,
        country: country === 'world' ? undefined : country,
      }),
    enabled: board === 'elo' && season != null,
  });
  const records = useQuery({
    queryKey: ['records', allTime ? 'all' : season, distinct],
    queryFn: () =>
      ranked.leaderboards.records({
        season: allTime ? undefined : season,
        distinct,
      }),
    enabled: board === 'records' && season != null,
  });
  const points = useQuery({
    queryKey: ['points', season, country, predicted],
    queryFn: () =>
      ranked.leaderboards.phase({
        season,
        country: country === 'world' ? undefined : country,
        predicted,
      }),
    enabled: board === 'points' && season != null,
  });
  const active = board === 'elo' ? elo : board === 'records' ? records : points;
  const countries = [
    ...new Set(
      current.data?.users
        .map((user) => user.country)
        .filter((code): code is string => !!code),
    ),
  ].sort();
  if (country !== 'world' && !countries.includes(country))
    countries.push(country);
  const rows: Row[] =
    board === 'elo'
      ? (elo.data?.users ?? []).map((player) => ({
          key: player.uuid,
          player,
          position: player.seasonResult.eloRank,
          value: String(player.seasonResult.eloRate),
        }))
      : board === 'records'
        ? (records.data ?? []).map((record) => ({
            key: String(record.id),
            player: record.user,
            position: record.rank,
            value: duration(record.time, true),
            detail: `Season ${record.season} · ${record.seed.overworld?.replaceAll('_', ' ').toLowerCase() ?? 'Random seed'}`,
            matchId: record.id,
          }))
        : (points.data?.users ?? []).map((player, index) => ({
            key: player.uuid,
            player,
            position: index + 1,
            value: `${predicted ? player.predPhasePoint : player.seasonResult.phasePoint} pts`,
            detail: `${player.seasonResult.eloRate} Elo`,
          }));
  const error = current.error ?? active.error;
  const refresh = () => {
    void current.refetch();
    void active.refetch();
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
      <FlatList
        data={error && !active.data ? [] : rows}
        keyExtractor={(row) => row.key}
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching || current.isRefetching}
            onRefresh={refresh}
            tintColor="#a3d65c"
            colors={['#70a822']}
          />
        }
        ListHeaderComponent={
          <View className="gap-4 p-4 pb-2">
            <SeasonSelect />
            {board === 'elo' && (
              <Txt className="text-xs text-ranked-muted">
                Ends{' '}
                {dateTime(
                  elo.data?.season.endsAt ?? current.data?.season.endsAt,
                )}
              </Txt>
            )}
            <PlayerSearch />
            <Segments
              value={board}
              onChange={setBoard}
              options={[
                { label: 'Elo', value: 'elo' },
                { label: 'Fastest times', value: 'records' },
                { label: 'Points', value: 'points' },
              ]}
            />
            {board === 'records' ? (
              <View className="gap-2">
                <Segments
                  value={allTime ? 'all' : 'season'}
                  onChange={(value) => setAllTime(value === 'all')}
                  options={[
                    { label: 'This season', value: 'season' },
                    { label: 'All time', value: 'all' },
                  ]}
                />
                <Segments
                  value={distinct ? 'unique' : 'all'}
                  onChange={(value) => setDistinct(value === 'unique')}
                  options={[
                    { label: 'Unique players', value: 'unique' },
                    { label: 'All runs', value: 'all' },
                  ]}
                />
              </View>
            ) : (
              <Select
                title="Country"
                value={country}
                onChange={setCountry}
                options={[
                  { label: '🌐 World', value: 'world' },
                  ...countries.map((code) => ({
                    label: `${flag(code)} ${code.toUpperCase()}`,
                    value: code,
                  })),
                ]}
              />
            )}
            {board === 'points' && (
              <View className="gap-2">
                <Segments
                  value={predicted ? 'predicted' : 'earned'}
                  onChange={(value) => setPredicted(value === 'predicted')}
                  options={[
                    { label: 'Earned points', value: 'earned' },
                    { label: 'Predicted points', value: 'predicted' },
                  ]}
                />
                <Txt className="text-xs text-ranked-muted">
                  Phase {points.data?.phase.number ?? '–'} · Ends{' '}
                  {dateTime(points.data?.phase.endsAt)}
                </Txt>
              </View>
            )}
            <View className="flex-row justify-between border-b border-ranked-border pb-2 pt-2">
              <Txt className="text-xs uppercase tracking-widest text-ranked-muted">
                {board === 'records' ? 'Fastest completions' : 'Leaderboard'}
              </Txt>
              <Txt className="text-xs text-zinc-500">
                {rows.length} {board === 'records' ? 'runs' : 'players'}
              </Txt>
            </View>
          </View>
        }
        ListEmptyComponent={
          <QueryState
            pending={!error && (current.isPending || active.isPending)}
            error={error}
            retry={refresh}
            empty={
              !active.isPending && !error
                ? 'No results for this season and country.'
                : undefined
            }
          />
        }
        ListFooterComponent={<View className="h-8" />}
        renderItem={({ item }) => (
          <PlayerRow
            player={item.player}
            position={item.position}
            value={item.value}
            detail={item.detail}
            onPress={() =>
              router.push(
                item.matchId
                  ? { pathname: '/match/[id]', params: { id: item.matchId } }
                  : {
                      pathname: '/player/[name]',
                      params: { name: item.player.nickname },
                    },
              )
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
