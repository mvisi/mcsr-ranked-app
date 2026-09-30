import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  Card,
  ExternalButton,
  Heading,
  QueryState,
  Select,
  Txt,
} from '@/components/ui';
import { ranked } from '@/lib/api';
import { dateTime, duration, label } from '@/lib/format';
import { signed } from '@/lib/matches';

const milestones: Record<string, string> = {
  'story.enter_the_nether': 'Nether enter',
  'nether.find_bastion': 'Bastion',
  'nether.loot_bastion': 'Bastion loot',
  'nether.find_fortress': 'Fortress',
  'nether.obtain_blaze_rod': 'First blaze rod',
  'projectelo.timeline.blind_travel': 'Blind travel',
  'story.follow_ender_eye': 'Stronghold',
  'story.enter_the_end': 'End enter',
  'projectelo.timeline.dragon_death': 'Dragon death',
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const valid = Number.isInteger(numericId) && numericId > 0;
  const match = useQuery({
    queryKey: ['match', numericId],
    queryFn: () => ranked.matches.get(numericId),
    enabled: valid,
  });
  const [selectedPlayer, setSelectedPlayer] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const data = match.data;
  const timelines = [...(data?.timelines ?? [])]
    .filter(
      (event) =>
        (showAll || event.type in milestones) &&
        (selectedPlayer === 'all' || event.uuid === selectedPlayer),
    )
    .sort((a, b) => a.time - b.time);
  const refresh = () => {
    void match.refetch();
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
      <Stack.Screen options={{ title: `Match #${id}` }} />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={match.isRefetching}
            onRefresh={refresh}
            colors={['#70a822']}
            tintColor="#a3d65c"
          />
        }
      >
        {!valid ? (
          <QueryState empty="Invalid match ID." />
        ) : !data ? (
          <QueryState
            pending={match.isPending}
            error={match.error}
            retry={refresh}
          />
        ) : (
          <>
            <Txt className="text-xs text-ranked-muted">
              Season {data.season} · {dateTime(data.date)}
            </Txt>
            <Card className="gap-4">
              <Heading>
                {data.forfeited
                  ? 'Forfeit'
                  : data.result.uuid
                    ? `Finished in ${duration(data.result.time, true)}`
                    : 'Draw'}
              </Heading>
              {data.players.map((player) => {
                const change = data.changes.find(
                  (entry) => entry.uuid === player.uuid,
                );
                const completion = data.completions.find(
                  (entry) => entry.uuid === player.uuid,
                );
                const winner = data.result.uuid === player.uuid;
                return (
                  <Pressable
                    key={player.uuid}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${player.nickname}'s stats`}
                    onPress={() =>
                      router.push({
                        pathname: '/player/[name]',
                        params: { name: player.nickname },
                      })
                    }
                    className="min-h-14 flex-row items-center gap-3 rounded px-1 py-2 active:bg-zinc-700"
                  >
                    <Avatar uuid={player.uuid} size={40} />
                    <View className="flex-1 gap-2">
                      <Txt
                        numberOfLines={1}
                        className={winner ? 'text-lime-300' : ''}
                      >
                        {player.nickname}
                      </Txt>
                      <Txt className="text-xs text-ranked-muted">
                        {winner ? 'Winner' : data.result.uuid ? 'Lost' : 'Draw'}{' '}
                        · {change ? `${signed(change.change)} Elo` : 'Unrated'}
                      </Txt>
                    </View>
                    <Txt className="text-sm">
                      {completion ? duration(completion.time, true) : '–'}
                    </Txt>
                  </Pressable>
                );
              })}
            </Card>
            <Card className="gap-2">
              <Heading>Seed</Heading>
              <Txt className="text-sm">
                {label(data.seed?.overworld ?? data.seedType ?? 'Random seed')}{' '}
                ·{' '}
                {label(
                  data.seed?.nether ?? data.bastionType ?? 'Unknown bastion',
                )}
              </Txt>
              {data.seed?.id && (
                <Txt selectable className="text-xs text-ranked-muted">
                  {data.seed.id}
                </Txt>
              )}
              {!!data.seed?.variations.length && (
                <Txt className="text-xs text-zinc-500">
                  {data.seed.variations.map(label).join(' · ')}
                </Txt>
              )}
              <Txt className="text-xs text-ranked-muted">
                {data.category ?? 'Any%'}
                {data.beginner ? ' · Beginner mode' : ''}
                {data.rank.allTime ? ` · All-time #${data.rank.allTime}` : ''}
                {data.rank.season ? ` · Season #${data.rank.season}` : ''}
              </Txt>
            </Card>
            <Heading>Timeline</Heading>
            <Select
              title="Timeline player"
              value={selectedPlayer}
              onChange={setSelectedPlayer}
              options={[
                { label: 'All players', value: 'all' },
                ...data.players.map((player) => ({
                  label: player.nickname,
                  value: player.uuid,
                })),
              ]}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: showAll }}
              onPress={() => setShowAll(!showAll)}
              className="min-h-12 justify-center rounded border border-ranked-border bg-ranked-surface px-3"
            >
              <Txt className="text-sm">
                {showAll ? '☑' : '☐'} Show every advancement
              </Txt>
            </Pressable>
            <Card className="p-0">
              {timelines.length === 0 && (
                <QueryState empty="No timeline recorded for this match." />
              )}
              {timelines.map((event, index) => (
                <View
                  key={`${event.uuid}-${event.type}-${index}`}
                  className="flex-row items-center gap-3 border-b border-zinc-700 px-4 py-3"
                >
                  <Txt className="w-16 text-sm text-lime-300">
                    {duration(event.time, true)}
                  </Txt>
                  <View className="flex-1 gap-2">
                    <Txt className="text-sm">
                      {milestones[event.type] ?? label(event.type)}
                    </Txt>
                    <Txt className="text-xs text-zinc-500">
                      {data.players.find((player) => player.uuid === event.uuid)
                        ?.nickname ?? 'Unknown player'}
                    </Txt>
                  </View>
                </View>
              ))}
            </Card>
            {!!data.vod?.length && <Heading>Match VODs</Heading>}
            {data.vod?.map((vod) => {
              const url = new URL(vod.url);
              url.searchParams.set(
                't',
                `${Math.max(0, data.date - vod.startsAt)}s`,
              );
              return (
                <ExternalButton
                  key={vod.uuid}
                  title={`Watch ${data.players.find((player) => player.uuid === vod.uuid)?.nickname ?? 'player'}'s VOD`}
                  url={url.toString()}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
