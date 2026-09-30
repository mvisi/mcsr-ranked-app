import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchRow, MatchesFooter } from '@/components/match-row';
import {
  Avatar,
  Button,
  Card,
  Heading,
  Input,
  QueryState,
  Segments,
  Txt,
} from '@/components/ui';
import { ranked } from '@/lib/api';
import { duration, percentage } from '@/lib/format';
import { uniqueMatches, useMatches } from '@/lib/matches';
import { SeasonSelect, useSeason } from '@/lib/season';

export default function CompareScreen() {
  const params = useLocalSearchParams<{ first?: string }>();
  const { season, current } = useSeason();
  const [first, setFirst] = useState(params.first ?? '');
  const [second, setSecond] = useState('');
  const [pair, setPair] = useState<{ first: string; second: string }>();
  const [type, setType] = useState<'2' | '1'>('2');
  const versus = useQuery({
    queryKey: ['versus', pair, season],
    queryFn: () => ranked.versus.get(pair!.first, pair!.second, { season }),
    enabled: !!pair && season != null,
  });
  const firstUser = useQuery({
    queryKey: ['player', pair?.first, season],
    queryFn: () => ranked.users.get(pair!.first, { season }),
    enabled: !!pair && season != null,
  });
  const secondUser = useQuery({
    queryKey: ['player', pair?.second, season],
    queryFn: () => ranked.users.get(pair!.second, { season }),
    enabled: !!pair && season != null,
  });
  const matches = useMatches({
    name: pair?.first ?? '',
    opponent: pair?.second,
    season,
    type: Number(type),
  });
  const rows = uniqueMatches(matches.data?.pages);
  const result = versus.data?.results[type === '2' ? 'ranked' : 'casual'];
  const players = versus.data?.players ?? [];
  const firstWins = result?.[players[0]?.uuid] ?? 0;
  const secondWins = result?.[players[1]?.uuid] ?? 0;
  const played = result?.total ?? 0;
  const valid =
    !!first.trim() &&
    !!second.trim() &&
    first.trim().toLowerCase() !== second.trim().toLowerCase();
  const compare = () => {
    if (!valid) return;
    Keyboard.dismiss();
    setPair({ first: first.trim(), second: second.trim() });
  };
  const refresh = () => {
    void current.refetch();
    if (pair) {
      void versus.refetch();
      void firstUser.refetch();
      void secondUser.refetch();
      void matches.refetch();
    }
  };
  const error = current.error ?? versus.error;
  const comparison = [
    {
      title: 'Personal best',
      left: duration(firstUser.data?.statistics.season.bestTime.ranked),
      right: duration(secondUser.data?.statistics.season.bestTime.ranked),
    },
    {
      title: 'Win rate',
      left: percentage(
        firstUser.data?.statistics.season.wins.ranked ?? null,
        firstUser.data?.statistics.season.playedMatches.ranked ?? null,
      ),
      right: percentage(
        secondUser.data?.statistics.season.wins.ranked ?? null,
        secondUser.data?.statistics.season.playedMatches.ranked ?? null,
      ),
    },
    {
      title: 'Peak Elo',
      left: firstUser.data?.seasonResult.highest ?? '–',
      right: secondUser.data?.seasonResult.highest ?? '–',
    },
    {
      title: 'Best win streak',
      left: firstUser.data?.statistics.season.highestWinStreak.ranked ?? '–',
      right: secondUser.data?.statistics.season.highestWinStreak.ranked ?? '–',
    },
  ];

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
      <Stack.Screen options={{ title: 'Compare players' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <FlatList
          data={versus.data && !error ? rows : []}
          keyExtractor={(match) => String(match.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={versus.isRefetching || matches.isRefetching}
              onRefresh={refresh}
              colors={['#70a822']}
              tintColor="#a3d65c"
            />
          }
          renderItem={({ item }) => (
            <MatchRow match={item} viewer={players[0]?.uuid} />
          )}
          ListHeaderComponent={
            <View className="gap-4 p-4">
              <SeasonSelect />
              <Input
                accessibilityLabel="First player"
                placeholder="First player name"
                value={first}
                onChangeText={setFirst}
                returnKeyType="next"
              />
              <Input
                accessibilityLabel="Second player"
                placeholder="Second player name"
                value={second}
                onChangeText={setSecond}
                onSubmitEditing={compare}
                returnKeyType="go"
              />
              <Button
                title="Compare players"
                onPress={compare}
                disabled={!valid}
              />
              {first.trim() &&
                first.trim().toLowerCase() === second.trim().toLowerCase() && (
                  <Txt className="text-xs text-yellow-300">
                    Choose two different players.
                  </Txt>
                )}
              {!pair ? (
                <QueryState empty="Enter two player names to compare their stats and head-to-head matches." />
              ) : !versus.data || error ? (
                <QueryState
                  pending={!error && versus.isPending}
                  error={error}
                  retry={refresh}
                />
              ) : (
                <>
                  <Segments
                    value={type}
                    onChange={setType}
                    options={[
                      { label: 'Ranked', value: '2' },
                      { label: 'Casual', value: '1' },
                    ]}
                  />
                  <Card className="gap-5">
                    <Heading>Head to head · Season {season}</Heading>
                    <View className="flex-row items-center gap-2">
                      {players.slice(0, 2).map((player, index) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`View ${player.nickname}'s stats`}
                          key={player.uuid}
                          onPress={() =>
                            router.push({
                              pathname: '/player/[name]',
                              params: { name: player.nickname },
                            })
                          }
                          className="flex-1 items-center gap-3"
                        >
                          <Avatar uuid={player.uuid} size={48} />
                          <Txt
                            className="text-center text-sm"
                            numberOfLines={1}
                          >
                            {player.nickname}
                          </Txt>
                          <Txt
                            className={
                              index === 0
                                ? 'text-3xl text-lime-300'
                                : 'text-3xl text-cyan-300'
                            }
                          >
                            {index === 0 ? firstWins : secondWins}
                          </Txt>
                          <Txt className="text-xs text-ranked-muted">wins</Txt>
                        </Pressable>
                      ))}
                    </View>
                    {played > 0 && (
                      <View
                        accessibilityLabel={`${firstWins} wins for ${players[0]?.nickname}, ${secondWins} wins for ${players[1]?.nickname}, ${played - firstWins - secondWins} draws`}
                        className="h-2 flex-row overflow-hidden rounded bg-zinc-700"
                      >
                        <View
                          className="bg-lime-400"
                          style={{ flex: firstWins }}
                        />
                        <View
                          className="bg-cyan-400"
                          style={{ flex: secondWins }}
                        />
                        <View
                          className="bg-zinc-500"
                          style={{
                            flex: Math.max(0, played - firstWins - secondWins),
                          }}
                        />
                      </View>
                    )}
                    <Txt className="text-center text-xs text-ranked-muted">
                      {played} matches ·{' '}
                      {Math.max(0, played - firstWins - secondWins)} draws
                    </Txt>
                    {type === '2' && (
                      <Txt className="text-center text-xs text-ranked-muted">
                        Net Elo ·{' '}
                        {players
                          .map(
                            (player) =>
                              `${player.nickname} ${versus.data.changes[player.uuid] > 0 ? '+' : ''}${versus.data.changes[player.uuid] ?? 0}`,
                          )
                          .join(' · ')}
                      </Txt>
                    )}
                  </Card>
                  <Card className="gap-4">
                    <Heading>Ranked season stats</Heading>
                    <QueryState
                      pending={firstUser.isPending || secondUser.isPending}
                      error={firstUser.error ?? secondUser.error}
                      retry={refresh}
                    />
                    {firstUser.data &&
                      secondUser.data &&
                      comparison.map((row) => (
                        <View
                          key={row.title}
                          className="flex-row items-center gap-2"
                        >
                          <Txt className="flex-1 text-center text-sm text-lime-300">
                            {row.left}
                          </Txt>
                          <Txt className="flex-1 text-center text-xs text-ranked-muted">
                            {row.title}
                          </Txt>
                          <Txt className="flex-1 text-center text-sm text-cyan-300">
                            {row.right}
                          </Txt>
                        </View>
                      ))}
                  </Card>
                  <Heading>Shared matches</Heading>
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            pair && versus.data && !error ? (
              <QueryState
                pending={matches.isPending}
                error={matches.error}
                retry={() => {
                  void matches.refetch();
                }}
                empty={
                  !matches.isPending && !matches.error
                    ? 'No shared matches in this season.'
                    : undefined
                }
              />
            ) : null
          }
          ListFooterComponent={
            pair && versus.data && !error ? (
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
