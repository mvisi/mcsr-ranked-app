import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import type { WeeklyRace } from 'mcsrranked-sdk';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sheet } from '@/components/sheet';
import {
  Avatar,
  Button,
  Card,
  Heading,
  IconButton,
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
      edges={['top', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
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
            <Txt accessibilityRole="header" className="text-xl">
              Weekly race
            </Txt>
            <View className="flex-row items-center gap-2">
              <IconButton
                label="Previous week"
                icon="chevron-back"
                disabled={!data || data.id <= 1}
                onPress={() => changeWeek(String(data!.id - 1))}
              />
              <View className="flex-1">
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
              </View>
              <IconButton
                label="Next week"
                icon="chevron-forward"
                disabled={!data || !current.data || data.id >= current.data.id}
                onPress={() =>
                  changeWeek(
                    data!.id + 1 === current.data!.id
                      ? 'current'
                      : String(data!.id + 1),
                  )
                }
              />
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
                  (key) => {
                    const done = copied === `${data.id}:${key}`;
                    return (
                      <Pressable
                        key={key}
                        accessibilityRole="button"
                        accessibilityLabel={`${done ? 'Copied' : 'Copy'} ${key === 'theEnd' ? 'The End' : key} seed`}
                        onPress={() => {
                          setCopyFailed(false);
                          void Clipboard.setStringAsync(data.seed[key])
                            .then(() => setCopied(`${data.id}:${key}`))
                            .catch(() => setCopyFailed(true));
                        }}
                        className="flex-row items-center gap-3 rounded-md active:opacity-70"
                      >
                        <View className="flex-1 gap-2">
                          <Txt className="text-xs uppercase text-ranked-muted">
                            {key === 'theEnd' ? 'The End' : key}
                          </Txt>
                          <Txt className="text-sm">{data.seed[key]}</Txt>
                        </View>
                        <Ionicons
                          name={done ? 'checkmark' : 'copy-outline'}
                          size={20}
                          color={done ? '#a3d65c' : '#a1a1aa'}
                        />
                      </Pressable>
                    );
                  },
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
      <Sheet
        visible={!!selected && !!data}
        label="Close race result"
        onClose={() => setSelected(undefined)}
      >
        {selected && data && (
          <>
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
            <Button
              title="Close"
              secondary
              onPress={() => setSelected(undefined)}
            />
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
