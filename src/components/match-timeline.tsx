import { router } from 'expo-router';
import type { MatchDetail } from 'mcsrranked-sdk';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Segments, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { matchTimeline } from '@/lib/match-timeline';
import { signed } from '@/lib/matches';

type Timing = {
  key: string;
  name: string;
  time: number;
  color: string;
};

function timeColor(color: string) {
  return color === '#111111' || color === '#660000' ? '#d4d4d8' : '#18181b';
}

function TimePill({ timing }: { timing?: Timing }) {
  return timing ? (
    <View
      className="w-16 items-center rounded-full px-1 py-1"
      style={{ backgroundColor: timing.color }}
    >
      <Txt className="text-xs" style={{ color: timeColor(timing.color) }}>
        {duration(timing.time)}
      </Txt>
    </View>
  ) : (
    <Txt className="w-16 text-center text-xs text-zinc-600">–</Txt>
  );
}

export function MatchTimeline({
  match,
  viewer,
}: {
  match: MatchDetail;
  viewer?: string;
}) {
  const [mode, setMode] = useState<'splits' | 'timestamps'>('splits');
  const { scale, players, bars } = matchTimeline(match, viewer);
  const showDetails = players.length <= 2;
  const timings = showDetails
    ? players.map((run) =>
        mode === 'splits' ? run.splits : run.checkpoints.slice(1),
      )
    : [];
  const rows: Timing[] = [];
  for (const points of timings) {
    points.forEach((point, index) => {
      if (rows.some((row) => row.key === point.key)) return;
      // Preserve stage order when one player is much farther ahead or dies.
      const next = points
        .slice(index + 1)
        .find((next) => rows.some((row) => row.key === next.key));
      const position = next
        ? rows.findIndex((row) => row.key === next.key)
        : rows.length;
      rows.splice(position, 0, point);
    });
  }
  const table = (
    <View className="flex-1 gap-2">
      {rows.map((row) => {
        const values = timings.map((points) =>
          points.find((point) => point.key === row.key),
        );
        const difference =
          players.length === 2 && values[0] && values[1]
            ? values[0].time - values[1].time
            : undefined;
        return (
          <View key={row.key} className="min-h-9 flex-row items-center gap-2">
            <TimePill timing={values[0]} />
            <View className="min-w-0 flex-1 items-center gap-1">
              <Txt className="text-center text-xs text-ranked-muted">
                {row.name}
              </Txt>
              {difference != null && (
                <Txt
                  className="text-[10px]"
                  style={{
                    color:
                      difference < 0
                        ? '#86efac'
                        : difference > 0
                          ? '#fca5a5'
                          : '#71717a',
                  }}
                >
                  {difference < 0 ? '−' : '+'}
                  {Math.abs(difference) < 1000
                    ? (Math.abs(difference) / 1000).toFixed(2)
                    : duration(Math.abs(difference))}
                </Txt>
              )}
            </View>
            {values.slice(1).map((timing, index) => (
              <TimePill key={players[index + 1].player.uuid} timing={timing} />
            ))}
          </View>
        );
      })}
    </View>
  );

  return (
    <View className="gap-5">
      <View className="gap-3">
        {bars.map((run) => {
          const time = run.completionTime ?? run.lastSplitTime;
          const barSplits = run.splits;
          const timeLabel =
            run.completionTime != null
              ? `Finished in ${duration(run.completionTime, true)}.`
              : run.lastSplitTime != null
                ? `Last recorded time ${duration(run.lastSplitTime, true)}. Furthest milestone ${run.furthestMilestone}.`
                : 'No split recorded.';
          return (
            <View key={run.player.uuid} className="gap-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${run.player.nickname}. ${timeLabel} View player stats.`}
                onPress={() =>
                  router.push({
                    pathname: '/player/[name]',
                    params: { name: run.player.nickname },
                  })
                }
                className="min-h-11 flex-row items-center gap-2 rounded active:bg-zinc-700"
              >
                <Avatar uuid={run.player.uuid} size={24} />
                <Txt className="shrink text-sm" numberOfLines={1}>
                  {run.player.nickname}
                </Txt>
                <Txt
                  className={`text-xs ${run.completionTime != null ? 'text-green-300' : 'text-zinc-300'}`}
                >
                  {duration(time, true)}
                  {run.completionTime == null && run.furthestMilestone
                    ? ` · ${run.furthestMilestone}`
                    : ''}
                </Txt>
              </Pressable>
              <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${run.player.nickname}'s match timeline. ${
                  barSplits.length
                    ? barSplits
                        .map(
                          (split) =>
                            `${split.name}: ${duration(split.time, true)}`,
                        )
                        .join(', ')
                    : 'No timeline recorded.'
                }`}
                className="relative h-3 overflow-hidden rounded-full bg-zinc-700"
              >
                {barSplits.map((split) => (
                  <View
                    key={split.key}
                    className="absolute bottom-0 top-0"
                    style={{
                      left: `${(split.start / scale) * 100}%`,
                      width: `${(split.time / scale) * 100}%`,
                      backgroundColor: split.color,
                      borderRightWidth: 1,
                      borderRightColor: '#27272a',
                    }}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      {showDetails && match.type === 2 && (
        <View className="flex-row gap-4">
          {players.map(({ player }) => {
            const change = match.changes.find(
              (entry) => entry.uuid === player.uuid,
            );
            const winner = match.result.uuid === player.uuid;
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
                className="min-h-14 flex-1 gap-2 rounded py-1 active:bg-zinc-700"
              >
                <View className="flex-row items-center gap-2">
                  <Avatar uuid={player.uuid} size={32} />
                  <Txt numberOfLines={1} className="flex-1 text-sm">
                    {player.nickname}
                  </Txt>
                </View>
                <Txt
                  className="text-xs"
                  style={{
                    color: winner
                      ? '#4ade80'
                      : match.result.uuid
                        ? '#f87171'
                        : '#60a5fa',
                  }}
                >
                  {winner ? 'WINNER' : match.result.uuid ? 'Lost' : 'Draw'}
                </Txt>
                <Txt className="text-[10px] text-ranked-muted">
                  {change?.eloRate != null && change.change != null
                    ? `${change.eloRate} → ${change.eloRate + change.change} Elo (${signed(change.change)})`
                    : 'Unrated'}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}
      {showDetails &&
        (rows.length ? (
          <>
            {match.type !== 2 && players.length === 2 && (
              <View className="flex-row justify-between gap-4">
                {players.map(({ player }) => (
                  <Txt
                    key={player.uuid}
                    numberOfLines={1}
                    className="flex-1 text-xs text-ranked-muted"
                    style={{
                      textAlign:
                        player.uuid === players[0].player.uuid
                          ? 'left'
                          : 'right',
                    }}
                  >
                    {player.nickname}
                  </Txt>
                ))}
              </View>
            )}
            <Segments
              value={mode}
              onChange={setMode}
              options={[
                { label: 'Splits', value: 'splits' },
                { label: 'Timestamps', value: 'timestamps' },
              ]}
            />
            {table}
          </>
        ) : (
          <Txt className="text-center text-xs text-ranked-muted">
            No timeline recorded for this match.
          </Txt>
        ))}
    </View>
  );
}
