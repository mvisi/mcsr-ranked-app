import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { Sheet } from '@/components/sheet';
import { Avatar, Button, ExternalButton, Stat, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import {
  isWalkover,
  matchWinner,
  placeLabel,
  playerRun,
  prize,
  type PlayoffMatch,
  type Playoffs,
} from '@/lib/playoffs';

export function shortDateTime(seconds: number) {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function LiveDot() {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2 w-2 rounded-full bg-red-500" />
      <Txt className="font-minecraft-bold text-xs text-red-400">LIVE</Txt>
    </View>
  );
}

function MatchStatus({
  match,
  playoffs,
}: {
  match: PlayoffMatch;
  playoffs: Playoffs;
}) {
  if (match.state === 'ACTIVE') return <LiveDot />;
  const text = isWalkover(match, playoffs.matches)
    ? 'Walkover'
    : match.startTime == null
      ? 'Not scheduled'
      : shortDateTime(match.startTime);
  return <Txt className="text-xs text-ranked-muted">{text}</Txt>;
}

// Fixed so the bracket can place cards by math: header, two rows, border.
export const MATCH_CARD_HEIGHT = 36 + 48 * 2 + 2;

export function MatchCard({
  match,
  playoffs,
  onPlayer,
  title,
}: {
  match: PlayoffMatch;
  playoffs: Playoffs;
  onPlayer: (player: number) => void;
  title?: string;
}) {
  const [vodFailed, setVodFailed] = useState(false);
  const winner = matchWinner(match);
  const showScore = match.state === 'ACTIVE' || match.state === 'DONE';
  return (
    <View
      style={{ height: MATCH_CARD_HEIGHT }}
      className={twMerge(
        'overflow-hidden rounded-md border border-ranked-border bg-ranked-surface',
        match.name === 'Grand Finals' && 'border-yellow-600',
        match.state === 'ACTIVE' && 'border-red-500',
      )}
    >
      <View className="h-9 flex-row items-center gap-3 pl-3">
        <View className="flex-1">
          <MatchStatus match={match} playoffs={playoffs} />
        </View>
        {match.vod && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Watch VOD"
            onPress={() => {
              setVodFailed(false);
              void Linking.openURL(match.vod!).catch(() => setVodFailed(true));
            }}
            className="h-9 flex-row items-center gap-1 px-1 active:opacity-70"
          >
            <Ionicons name="logo-youtube" size={14} color="#a1a1aa" />
            <Txt className="text-xs text-ranked-muted">
              {vodFailed ? 'Failed' : 'VOD'}
            </Txt>
          </Pressable>
        )}
        <Txt
          className={twMerge(
            'pr-3 text-xs text-zinc-500',
            match.name === 'Grand Finals' && title && 'text-yellow-300',
          )}
        >
          {title ?? `First to ${match.maxRoundScore}`}
        </Txt>
      </View>
      {[0, 1].map((side) => {
        const slot = match.participants[side];
        const player =
          slot?.player != null ? playoffs.players[slot.player] : undefined;
        if (!slot || slot.player == null || !player)
          return (
            <View
              key={side}
              className="h-12 flex-row items-center border-t border-zinc-800 px-3"
            >
              <Txt className="text-sm text-zinc-600">TBD</Txt>
            </View>
          );
        const won = winner === side;
        const lost = winner !== -1 && !won;
        return (
          <Pressable
            key={side}
            accessibilityRole="button"
            accessibilityLabel={`Seed ${player.seedNumber + 1}, ${player.nickname}${showScore ? `, ${slot.roundScore ?? 0} rounds` : ''}${won ? ', winner' : ''}`}
            onPress={() => onPlayer(slot.player!)}
            className="h-12 flex-row items-center gap-3 border-t border-zinc-800 pl-3 active:bg-zinc-700"
          >
            <Txt className="w-5 text-right text-xs text-zinc-500">
              {player.seedNumber + 1}
            </Txt>
            <Avatar uuid={player.uuid} size={24} />
            <Txt
              numberOfLines={1}
              className={twMerge(
                'flex-1 text-sm',
                lost && 'text-zinc-500',
                won && 'text-white',
              )}
            >
              {player.nickname}
            </Txt>
            {showScore && (
              <View
                className={twMerge(
                  'w-11 items-center justify-center self-stretch bg-zinc-800',
                  won && 'bg-lime-700',
                )}
              >
                <Txt
                  className={twMerge(
                    'font-minecraft-bold text-base text-zinc-400',
                    won && 'text-white',
                  )}
                >
                  {slot.roundScore ?? 0}
                </Txt>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Podium({
  playoffs,
  onPlayer,
}: {
  playoffs: Playoffs;
  onPlayer: (player: number) => void;
}) {
  const spots = [2, 1, 3].map((place) =>
    playoffs.results.find(
      (result) => result.place === place && result.player != null,
    ),
  );
  if (!spots[1]) return null;
  return (
    <View className="flex-row items-end gap-2">
      {spots.map((result, index) => {
        if (!result) return <View key={index} className="flex-1" />;
        const player = playoffs.players[result.player!];
        const first = result.place === 1;
        return (
          <Pressable
            key={result.place}
            accessibilityRole="button"
            accessibilityLabel={`${placeLabel(playoffs, result.place)} place, ${player.nickname}, ${prize(result.prize)}`}
            onPress={() => onPlayer(result.player!)}
            className={twMerge(
              'flex-1 items-center gap-2 rounded-md border border-ranked-border bg-ranked-surface px-2 py-3 active:opacity-70',
              first && 'border-yellow-600 py-5',
            )}
          >
            {first && <Ionicons name="trophy" size={20} color="#facc15" />}
            <Avatar uuid={player.uuid} size={first ? 48 : 36} />
            <Txt
              numberOfLines={1}
              adjustsFontSizeToFit
              className={twMerge('text-xs', first && 'text-sm')}
            >
              {player.nickname}
            </Txt>
            <Txt
              className={twMerge(
                'text-xs text-ranked-muted',
                first && 'text-yellow-300',
                result.place === 3 && 'text-orange-300',
              )}
            >
              {placeLabel(playoffs, result.place)}
              {result.prize > 0 ? ` · ${prize(result.prize)}` : ''}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export type PlayoffSelection = { player: number } | { match: number };

export function PlayoffSheet({
  playoffs,
  selection,
  onSelect,
  onShowInBracket,
  onClose,
}: {
  playoffs: Playoffs;
  selection: PlayoffSelection | undefined;
  onSelect: (selection: PlayoffSelection) => void;
  onShowInBracket: (match: PlayoffMatch) => void;
  onClose: () => void;
}) {
  const player =
    selection && 'player' in selection && playoffs.players[selection.player]
      ? selection.player
      : undefined;
  const match =
    selection && 'match' in selection
      ? playoffs.matches.find((other) => other.id === selection.match)
      : undefined;
  return (
    <Sheet
      visible={player != null || !!match}
      label={match ? 'Close match' : 'Close player'}
      onClose={onClose}
    >
      {player != null && (
        <PlayerDetails
          playoffs={playoffs}
          player={player}
          onMatch={(id) => onSelect({ match: id })}
          onClose={onClose}
        />
      )}
      {match && (
        <MatchDetails
          playoffs={playoffs}
          match={match}
          onPlayer={(index) => onSelect({ player: index })}
          onShowInBracket={() => onShowInBracket(match)}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function MatchDetails({
  playoffs,
  match,
  onPlayer,
  onShowInBracket,
  onClose,
}: {
  playoffs: Playoffs;
  match: PlayoffMatch;
  onPlayer: (player: number) => void;
  onShowInBracket: () => void;
  onClose: () => void;
}) {
  const winner = matchWinner(match);
  const winnerSlot = match.participants[winner];
  const loserSlot = match.participants[1 - winner];
  const summary =
    match.state === 'ACTIVE'
      ? 'Live now'
      : winnerSlot?.player != null
        ? `${playoffs.players[winnerSlot.player]?.nickname} won ${winnerSlot.roundScore ?? 0}–${loserSlot?.roundScore ?? 0}`
        : isWalkover(match, playoffs.matches)
          ? 'Walkover'
          : match.startTime != null
            ? shortDateTime(match.startTime)
            : 'Not scheduled yet';
  return (
    <>
      <View className="gap-2">
        <Txt accessibilityRole="header" className="text-xl">
          {match.name}
        </Txt>
        <Txt className="text-sm text-ranked-muted">{summary}</Txt>
      </View>
      <MatchCard match={match} playoffs={playoffs} onPlayer={onPlayer} />
      {match.vod && (
        <ExternalButton title="Watch VOD" url={match.vod} icon="logo-youtube" />
      )}
      <Button title="Show in bracket" onPress={onShowInBracket} />
      <Button title="Close" secondary onPress={onClose} />
    </>
  );
}

function PlayerDetails({
  playoffs,
  player,
  onMatch,
  onClose,
}: {
  playoffs: Playoffs;
  player: number;
  onMatch: (id: number) => void;
  onClose: () => void;
}) {
  const info = playoffs.players[player];
  const result = playoffs.results.find((entry) => entry.player === player);
  const run = playerRun(playoffs, player);
  return (
    <>
      <View className="flex-row items-center gap-4">
        <Avatar uuid={info.uuid} size={48} />
        <View className="flex-1 gap-2">
          <Txt className="text-xl">{info.nickname}</Txt>
          <Txt className="text-sm text-ranked-muted">
            Seed #{info.seedNumber + 1}
            {result ? ` · ${placeLabel(playoffs, result.place)} place` : ''}
          </Txt>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-4">
        <Stat
          title="Season elo"
          value={
            info.seasonEloRate == null
              ? '–'
              : `${info.seasonEloRate}${info.seasonEloRank ? ` · #${info.seasonEloRank}` : ''}`
          }
        />
        <Stat title="Personal best" value={duration(info.personalBest)} />
        {result && result.prize > 0 && (
          <Stat title="Prize" value={prize(result.prize)} />
        )}
      </View>
      <View className="gap-2">
        <Txt className="font-minecraft-bold text-xs uppercase tracking-widest text-ranked-muted">
          Bracket run
        </Txt>
        {run.length === 0 && (
          <Txt className="text-sm text-ranked-muted">No matches yet.</Txt>
        )}
        {run.map(({ match, side, opponent, result: outcome }) => (
          <Pressable
            key={match.id}
            accessibilityRole="button"
            accessibilityHint="Opens this match"
            onPress={() => onMatch(match.id)}
            className="min-h-14 flex-row items-center gap-3 rounded-md border border-ranked-border bg-ranked-surface px-3 py-2 active:bg-zinc-700"
          >
            <View
              className={twMerge(
                'h-7 w-7 items-center justify-center rounded bg-zinc-700',
                outcome === 'won' && 'bg-lime-700',
                outcome === 'lost' && 'bg-red-900',
              )}
            >
              <Txt className="font-minecraft-bold text-xs">
                {outcome === 'won' ? 'W' : outcome === 'lost' ? 'L' : '–'}
              </Txt>
            </View>
            <View className="flex-1 gap-1">
              <Txt className="text-xs text-ranked-muted">{match.name}</Txt>
              <Txt numberOfLines={1} className="text-sm">
                {opponent
                  ? `vs ${opponent.nickname}`
                  : isWalkover(match, playoffs.matches)
                    ? 'Walkover'
                    : 'vs TBD'}
              </Txt>
            </View>
            {match.state === 'ACTIVE' ? (
              <LiveDot />
            ) : match.state === 'DONE' ? (
              <Txt className="text-sm tabular-nums">
                {match.participants[side]?.roundScore ?? 0}–
                {match.participants[1 - side]?.roundScore ?? 0}
              </Txt>
            ) : match.startTime != null ? (
              <Txt className="text-xs text-ranked-muted">
                {shortDateTime(match.startTime)}
              </Txt>
            ) : null}
            <Ionicons name="chevron-forward" size={14} color="#71717a" />
          </Pressable>
        ))}
      </View>
      <Button
        title="View player stats"
        onPress={() => {
          onClose();
          router.push({
            pathname: '/player/[name]',
            params: { name: info.nickname },
          });
        }}
      />
      <Button title="Close" secondary onPress={onClose} />
    </>
  );
}
