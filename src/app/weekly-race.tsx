import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import type { WeeklyRace } from 'mcsrranked-sdk';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  Button,
  Card,
  ExternalButton,
  Heading,
  Input,
  PlayerRow,
  QueryState,
  Select,
  Stat,
  Txt,
} from '@/components/ui';
import { ranked } from '@/lib/api';
import { dateTime, duration } from '@/lib/format';
import { useClock } from '@/lib/use-clock';

type RaceEntry = WeeklyRace['leaderboard'][number];

export default function WeeklyRaceScreen() {
  const now = useClock();
  const [week, setWeek] = useState<number>();
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<RaceEntry>();
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const current = useQuery({
    queryKey: ['weekly-race', 'current'],
    queryFn: () => ranked.weeklyRaces.current(),
  });
  const archive = useQuery({
    queryKey: ['weekly-race', week],
    queryFn: () => ranked.weeklyRaces.get(week!),
    enabled: week != null,
  });
  const race = week == null ? current : archive;
  const data = race.data;
  const rows = (data?.leaderboard ?? []).filter((entry) =>
    entry.player.nickname.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const refresh = () => {
    void current.refetch();
    if (week != null) void archive.refetch();
  };
  const changeWeek = (value: string) => {
    setWeek(value === 'current' ? undefined : Number(value));
    setSelected(undefined);
    setCopied('');
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
      <Stack.Screen options={{ title: 'Weekly race' }} />
      <FlatList
        data={rows}
        keyExtractor={(entry) => entry.player.uuid}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={race.isRefetching}
            onRefresh={refresh}
            colors={['#70a822']}
            tintColor="#a3d65c"
          />
        }
        renderItem={({ item }) => (
          <PlayerRow
            player={item.player}
            position={item.rank}
            value={duration(item.time, true)}
            onPress={() => setSelected(item)}
          />
        )}
        ListHeaderComponent={
          <View className="gap-4 p-4">
            <Select
              title="Race week"
              value={week == null ? 'current' : String(week)}
              onChange={changeWeek}
              options={[
                {
                  label: current.data
                    ? `Week ${current.data.id} · Current`
                    : 'Current week',
                  value: 'current',
                },
                ...Array.from(
                  { length: Math.max(0, (current.data?.id ?? 1) - 1) },
                  (_, index) => ({
                    label: `Week ${current.data!.id - index - 1}`,
                    value: String(current.data!.id - index - 1),
                  }),
                ),
              ]}
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  secondary
                  title="Previous week"
                  disabled={!data || data.id <= 1}
                  onPress={() => changeWeek(String(data!.id - 1))}
                />
              </View>
              <View className="flex-1">
                <Button
                  secondary
                  title="Next week"
                  disabled={
                    !data || !current.data || data.id >= current.data.id
                  }
                  onPress={() =>
                    changeWeek(
                      data!.id + 1 === current.data!.id
                        ? 'current'
                        : String(data!.id + 1),
                    )
                  }
                />
              </View>
            </View>
            {data && (
              <Txt className="text-xs text-ranked-muted">
                {data.endsAt * 1000 > now ? 'Ends' : 'Ended'}{' '}
                {dateTime(data.endsAt)} · {data.leaderboard.length} runs
              </Txt>
            )}
            <Input
              accessibilityLabel="Find a weekly race player"
              placeholder="Find a player in this race"
              value={filter}
              onChangeText={setFilter}
            />
            {data && (
              <Button
                secondary
                title={showSeed ? 'Hide race seed' : 'Show race seed'}
                onPress={() => setShowSeed(!showSeed)}
              />
            )}
            {data && showSeed && (
              <Card className="gap-4">
                <Heading>Race seed</Heading>
                {(['overworld', 'nether', 'theEnd', 'rng'] as const).map(
                  (key) => (
                    <View key={key} className="gap-2">
                      <Txt className="text-xs uppercase text-ranked-muted">
                        {key === 'theEnd' ? 'The End' : key}
                      </Txt>
                      <Txt selectable className="text-sm">
                        {data.seed[key]}
                      </Txt>
                      <Button
                        secondary
                        title={
                          copied === `${data.id}:${key}`
                            ? 'Copied'
                            : 'Copy seed'
                        }
                        onPress={() => {
                          setCopyFailed(false);
                          void Clipboard.setStringAsync(data.seed[key])
                            .then(() => setCopied(`${data.id}:${key}`))
                            .catch(() => setCopyFailed(true));
                        }}
                      />
                    </View>
                  ),
                )}
                {copyFailed && (
                  <Txt className="text-xs text-red-300">
                    Could not copy the seed. Try again.
                  </Txt>
                )}
              </Card>
            )}
            <Heading>Fastest times</Heading>
          </View>
        }
        ListEmptyComponent={
          <QueryState
            pending={race.isPending}
            error={race.error ?? current.error}
            retry={refresh}
            empty={
              !race.isPending && !race.error
                ? filter
                  ? 'No players match this name.'
                  : 'No completions recorded for this week.'
                : undefined
            }
          />
        }
        ListFooterComponent={<View className="h-8" />}
      />
      <Modal
        transparent
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(undefined)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close race result"
            onPress={() => setSelected(undefined)}
            className="flex-1"
          />
          <SafeAreaView
            edges={['bottom', 'left', 'right']}
            className="max-h-[80%] rounded-t-xl border border-ranked-border bg-ranked-background"
          >
            {selected && data && (
              <ScrollView contentContainerClassName="gap-5 p-5">
                <View className="flex-row items-center gap-4">
                  <Avatar uuid={selected.player.uuid} size={48} />
                  <View className="flex-1 gap-2">
                    <Txt className="text-xl">{selected.player.nickname}</Txt>
                    <Txt className="text-sm text-ranked-muted">
                      Week {data.id} · Rank #{selected.rank}
                    </Txt>
                  </View>
                </View>
                <View className="flex-row gap-4">
                  <Stat
                    title="Completion time"
                    value={duration(selected.time, true)}
                  />
                  <Stat
                    title="Behind first place"
                    value={`+${duration(Math.max(0, selected.time - (data.leaderboard[0]?.time ?? selected.time)), true)}`}
                  />
                </View>
                <Button
                  title="View player stats"
                  onPress={() => {
                    setSelected(undefined);
                    router.push({
                      pathname: '/player/[name]',
                      params: { name: selected.player.nickname },
                    });
                  }}
                />
                {selected.replayExist && (
                  <ExternalButton
                    title="Watch replay on the website"
                    url={`https://mcsrranked.com/stats/weekly-race/${selected.player.uuid}?week=${data.id}`}
                  />
                )}
                <Button
                  title="Close"
                  secondary
                  onPress={() => setSelected(undefined)}
                />
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
