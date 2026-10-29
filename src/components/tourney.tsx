import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { Sheet } from '@/components/sheet';
import {
  Avatar,
  Button,
  QueryState,
  Segments,
  Stat,
  Txt,
} from '@/components/ui';
import { ordinal } from '@/lib/playoffs';
import {
  isFinished,
  tourneyRounds,
  type Tourney,
  type TourneyEntry,
  type TourneyPlayer,
  type TourneyRound,
} from '@/lib/tourneys';

const PREVIEW_ROWS = 20;

function openMatch(id: number) {
  router.push({ pathname: '/match/[id]', params: { id: String(id) } });
}

export function TourneyView({ tourney }: { tourney: Tourney }) {
  const [tab, setTab] = useState<'leaderboard' | 'rounds'>('leaderboard');
  const [showAll, setShowAll] = useState(false);
  // One sheet with swappable content, so modals never stack.
  const [sheet, setSheet] = useState<
    { player: string } | { round: number } | undefined
  >();
  const setSelected = (player: string) => setSheet({ player });
  const close = () => setSheet(undefined);
  const players = new Map(
    tourney.players.map((player) => [player.uuid, player]),
  );
  const rounds = tourneyRounds(tourney);
  const alive = tourney.brackets.filter((entry) => !entry.eliminated);
  const rows = showAll
    ? tourney.brackets
    : tourney.brackets.slice(0, Math.max(PREVIEW_ROWS, alive.length));
  const selected = sheet && 'player' in sheet ? sheet.player : undefined;
  const selectedEntry = tourney.brackets.find(
    (entry) => entry.uuid === selected,
  );
  const round = sheet && 'round' in sheet ? rounds[sheet.round] : undefined;

  return (
    <View className="gap-4">
      {alive.length > 0 && alive.length <= 8 && (
        <View className="gap-2">
          <Txt className="font-minecraft-bold text-xs uppercase tracking-widest text-ranked-muted">
            {isFinished(tourney)
              ? `Last ${alive.length} standing`
              : `${alive.length} still in`}
          </Txt>
          <View className="flex-row flex-wrap gap-2">
            {alive.map((entry) => (
              <Survivor
                key={entry.uuid}
                entry={entry}
                player={players.get(entry.uuid)}
                onPress={() => setSelected(entry.uuid)}
              />
            ))}
          </View>
        </View>
      )}
      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Leaderboard', value: 'leaderboard' },
          { label: `Rounds (${rounds.length})`, value: 'rounds' },
        ]}
      />
      {tab === 'leaderboard' ? (
        <View className="gap-3">
          <View className="overflow-hidden rounded-md border border-ranked-border">
            {rows.map((entry, index) => (
              <View key={entry.uuid}>
                {entry.eliminated &&
                  index > 0 &&
                  !rows[index - 1].eliminated && <Divider>Eliminated</Divider>}
                <LeaderboardRow
                  entry={entry}
                  player={players.get(entry.uuid)}
                  rounds={tourney.matches.length}
                  first={index === 0}
                  onPress={() => setSelected(entry.uuid)}
                />
              </View>
            ))}
          </View>
          {tourney.brackets.length > rows.length && (
            <Button
              secondary
              title={`Show all ${tourney.brackets.length} players`}
              onPress={() => setShowAll(true)}
            />
          )}
        </View>
      ) : rounds.length === 0 ? (
        <QueryState empty="No rounds played yet." />
      ) : (
        <View className="overflow-hidden rounded-md border border-ranked-border">
          {rounds.map((item, index) => (
            <RoundRow
              key={item.matchId}
              round={item}
              winner={players.get(item.finishers[0]?.entry.uuid ?? '')}
              first={index === 0}
              onPress={() => setSheet({ round: index })}
            />
          ))}
        </View>
      )}
      <Sheet
        visible={!!selectedEntry || !!round}
        label={round ? 'Close round' : 'Close player'}
        onClose={close}
      >
        {selectedEntry && (
          <PlayerDetails
            entry={selectedEntry}
            player={players.get(selectedEntry.uuid)}
            tourney={tourney}
            onClose={close}
          />
        )}
        {round && (
          <RoundDetails
            round={round}
            players={players}
            onClose={close}
            onPlayer={setSelected}
          />
        )}
      </Sheet>
    </View>
  );
}

function Divider({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 border-t border-zinc-800 bg-ranked-surface px-3 py-2">
      <DashedLine />
      <Txt className="font-minecraft-bold text-xs uppercase tracking-widest text-red-400">
        {children}
      </Txt>
      <DashedLine />
    </View>
  );
}

// iOS only draws dashed borders on all four sides, so this clips a dashed
// box down to its top edge.
function DashedLine() {
  return (
    <View className="h-px flex-1 overflow-hidden">
      <View className="-mx-px h-1 rounded-none border border-dashed border-red-500" />
    </View>
  );
}

function Survivor({
  entry,
  player,
  onPress,
}: {
  entry: TourneyEntry;
  player: TourneyPlayer | undefined;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rank ${entry.rank}, ${player?.nickname ?? 'Unknown player'}, ${entry.point} points`}
      onPress={onPress}
      className={twMerge(
        'min-w-[47%] flex-1 flex-row items-center gap-3 rounded-md border border-ranked-border bg-ranked-surface p-3 active:opacity-70',
        entry.rank === 1 && 'border-yellow-600',
      )}
    >
      {player && <Avatar uuid={player.uuid} size={32} />}
      <View className="flex-1 gap-1">
        <Txt numberOfLines={1} className="text-sm">
          {player?.nickname ?? 'Unknown'}
        </Txt>
        <Txt
          className={twMerge(
            'text-xs text-ranked-muted',
            entry.rank === 1 && 'text-yellow-300',
          )}
        >
          #{entry.rank} · {entry.point} pts
        </Txt>
      </View>
    </Pressable>
  );
}

function Movement({ entry }: { entry: TourneyEntry }) {
  const change = entry.prevRank - entry.rank;
  if (change === 0) return null;
  return (
    <Txt
      className={twMerge(
        'text-xs',
        change > 0 ? 'text-lime-300' : 'text-red-400',
      )}
    >
      {change > 0 ? '▲' : '▼'}
      {Math.abs(change)}
    </Txt>
  );
}

function LeaderboardRow({
  entry,
  player,
  rounds,
  first,
  onPress,
}: {
  entry: TourneyEntry;
  player: TourneyPlayer | undefined;
  rounds: number;
  first: boolean;
  onPress: () => void;
}) {
  const wins = entry.completions.filter(
    (completion) => completion?.place === 1,
  ).length;
  const dnfs = entry.completions
    .slice(0, rounds)
    .filter((completion) => !completion).length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rank ${entry.rank}, ${player?.nickname ?? 'Unknown player'}, ${entry.point} points, ${wins} round wins, ${dnfs} rounds without a finish${entry.eliminated ? ', eliminated' : ''}`}
      onPress={onPress}
      className={twMerge(
        'min-h-16 flex-row items-center gap-3 bg-ranked-surface px-3 py-2 active:bg-zinc-700',
        !first && 'border-t border-zinc-800',
      )}
    >
      <View className="w-8 items-end gap-1">
        <Txt
          numberOfLines={1}
          adjustsFontSizeToFit
          className={twMerge(
            'text-sm text-zinc-500',
            entry.rank === 1 && 'text-yellow-300',
            !entry.eliminated && entry.rank > 1 && 'text-zinc-200',
          )}
        >
          {entry.rank}
        </Txt>
        <Movement entry={entry} />
      </View>
      {player && <Avatar uuid={player.uuid} />}
      <Txt
        numberOfLines={1}
        className={twMerge(
          'flex-1 text-sm',
          entry.eliminated && 'text-zinc-400',
        )}
      >
        {player?.nickname ?? 'Unknown'}
      </Txt>
      <Txt
        className={twMerge(
          'text-sm',
          entry.eliminated ? 'text-zinc-500' : 'text-lime-300',
        )}
      >
        {entry.point}
      </Txt>
    </Pressable>
  );
}

function RoundRow({
  round,
  winner,
  first,
  onPress,
}: {
  round: TourneyRound;
  winner: TourneyPlayer | undefined;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Round ${round.number}, won by ${winner?.nickname ?? 'nobody'}, ${round.finishers.length} finished`}
      onPress={onPress}
      className={twMerge(
        'min-h-16 flex-row items-center gap-3 bg-ranked-surface px-3 py-2 active:bg-zinc-700',
        !first && 'border-t border-zinc-800',
      )}
    >
      <Txt className="w-8 text-right text-sm text-zinc-500">{round.number}</Txt>
      {winner ? (
        <Avatar uuid={winner.uuid} />
      ) : (
        <View className="h-8 w-8 rounded bg-zinc-700" />
      )}
      <View className="flex-1 gap-1">
        <Txt numberOfLines={1} className="text-sm">
          {winner?.nickname ?? 'No finishers'}
        </Txt>
        <Txt className="text-xs text-zinc-500">
          {winner ? 'Round win · ' : ''}
          {round.finishers.length} finished
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#71717a" />
    </Pressable>
  );
}

function PlayerDetails({
  entry,
  player,
  tourney,
  onClose,
}: {
  entry: TourneyEntry;
  player: TourneyPlayer | undefined;
  tourney: Tourney;
  onClose: () => void;
}) {
  const finishes = entry.completions.filter((completion) => completion);
  const best = Math.min(...finishes.map((completion) => completion!.place));
  return (
    <>
      <View className="flex-row items-center gap-4">
        {player && <Avatar uuid={player.uuid} size={48} />}
        <View className="flex-1 gap-2">
          <Txt className="text-xl">{player?.nickname ?? 'Unknown'}</Txt>
          <Txt
            className={twMerge(
              'text-sm text-ranked-muted',
              entry.eliminated && 'text-red-400',
            )}
          >
            Rank #{entry.rank}
            {entry.eliminated ? ' · Eliminated' : ''}
          </Txt>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-4">
        <Stat title="Points" value={entry.point} />
        <Stat
          title="Best finish"
          value={finishes.length ? ordinal(best) : '–'}
        />
        <Stat
          title="Rounds finished"
          value={`${finishes.length}/${tourney.matches.length}`}
        />
        {entry.bonus > 0 && (
          <Stat title="Bonus points" value={`+${entry.bonus}`} />
        )}
      </View>
      <View className="gap-2">
        <Txt className="font-minecraft-bold text-xs uppercase tracking-widest text-ranked-muted">
          Rounds
        </Txt>
        {tourney.matches.map((matchId, index) => {
          const completion = entry.completions[index];
          return (
            <Pressable
              key={matchId}
              accessibilityRole="button"
              accessibilityHint="Opens the match"
              onPress={() => {
                onClose();
                openMatch(matchId);
              }}
              className="min-h-12 flex-row items-center gap-3 rounded-md border border-ranked-border bg-ranked-surface px-3 py-2 active:bg-zinc-700"
            >
              <Txt className="w-20 text-xs text-ranked-muted">
                Round {index + 1}
              </Txt>
              <Txt
                className={twMerge(
                  'flex-1 text-sm',
                  !completion && 'text-zinc-500',
                  completion?.place === 1 && 'text-yellow-300',
                )}
              >
                {completion ? ordinal(completion.place) : 'No finish'}
              </Txt>
              <Txt className="text-sm text-lime-300">
                {completion ? `+${completion.score}` : ''}
              </Txt>
              <Ionicons name="chevron-forward" size={14} color="#71717a" />
            </Pressable>
          );
        })}
      </View>
      {player && (
        <Button
          title="View player stats"
          onPress={() => {
            onClose();
            router.push({
              pathname: '/player/[name]',
              params: { name: player.nickname },
            });
          }}
        />
      )}
      <Button title="Close" secondary onPress={onClose} />
    </>
  );
}

function RoundDetails({
  round,
  players,
  onClose,
  onPlayer,
}: {
  round: TourneyRound;
  players: Map<string, TourneyPlayer>;
  onClose: () => void;
  onPlayer: (uuid: string) => void;
}) {
  return (
    <>
      <View className="gap-2">
        <Txt className="text-xl">Round {round.number}</Txt>
        <Txt className="text-sm text-ranked-muted">
          {round.finishers.length} players finished
        </Txt>
      </View>
      <Button
        title="Open match details"
        onPress={() => {
          onClose();
          openMatch(round.matchId);
        }}
      />
      <View className="overflow-hidden rounded-md border border-ranked-border">
        {round.finishers.map(({ entry, place, score }, index) => {
          const player = players.get(entry.uuid);
          return (
            <Pressable
              key={entry.uuid}
              accessibilityRole="button"
              onPress={() => onPlayer(entry.uuid)}
              className={twMerge(
                'min-h-12 flex-row items-center gap-3 bg-ranked-surface px-3 py-2 active:bg-zinc-700',
                index > 0 && 'border-t border-zinc-800',
              )}
            >
              <Txt
                className={twMerge(
                  'w-10 text-right text-xs text-zinc-500',
                  place === 1 && 'text-yellow-300',
                )}
              >
                {ordinal(place)}
              </Txt>
              {player && <Avatar uuid={player.uuid} size={24} />}
              <Txt numberOfLines={1} className="flex-1 text-sm">
                {player?.nickname ?? 'Unknown'}
              </Txt>
              <Txt className="text-sm text-lime-300">+{score}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Button title="Close" secondary onPress={onClose} />
    </>
  );
}
