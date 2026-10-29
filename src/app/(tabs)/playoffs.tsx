import { useQuery, type Query } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { twMerge } from 'tailwind-merge';

import { SwipeBracket } from '@/components/bracket';
import {
  LiveDot,
  MatchCard,
  PlayoffSheet,
  Podium,
  shortDateTime,
  type PlayoffSelection,
} from '@/components/playoffs';
import { TourneyView } from '@/components/tourney';
import {
  Avatar,
  Card,
  ExternalButton,
  Heading,
  QueryState,
  RefreshWarning,
  Segments,
  Select,
  Txt,
} from '@/components/ui';
import {
  currentRound,
  getPlayoffs,
  matchWinner,
  placeLabel,
  playoffRounds,
  prize,
  type PlayoffMatch,
  type Playoffs,
} from '@/lib/playoffs';
import { useSeason } from '@/lib/season';
import {
  isFinished,
  isMissing,
  TOURNEY_NAMES,
  useTourney,
  WC_SEASON,
  type TourneyType,
} from '@/lib/tourneys';
import { useClock } from '@/lib/use-clock';

type Tab = 'bracket' | 'schedule' | 'standings';
type Event = 'main' | TourneyType;

const refetchWhileLive = (query: Query<Playoffs>) =>
  query.state.data?.matches.some((match) => match.state === 'ACTIVE')
    ? 30_000
    : false;

export default function PlayoffsScreen() {
  const now = useClock();
  const [event, setEvent] = useState<Event>('main');
  const [season, setSeason] = useState<number>();
  const [tab, setTab] = useState<Tab>('bracket');
  const [round, setRound] = useState<number>();
  const [sheet, setSheet] = useState<PlayoffSelection>();
  const setPlayer = (player: number) => setSheet({ player });
  const latest = useQuery({
    queryKey: ['playoffs', 'latest'],
    queryFn: () => getPlayoffs(),
    refetchInterval: refetchWhileLive,
  });
  const archive = useQuery({
    queryKey: ['playoffs', season],
    queryFn: () => getPlayoffs(season!),
    enabled: event === 'main' && season != null,
    refetchInterval: refetchWhileLive,
  });
  const ranking = useSeason().current;
  const currentSeason = ranking.data?.season.number;
  const side = useTourney(
    event === 'main' ? undefined : event,
    event === 'wc' ? WC_SEASON : season,
    ranking.isError ? latest.data?.season : currentSeason,
  );
  const tourney = event === 'main' ? undefined : side.data;
  const query = season == null ? latest : archive;
  const data = query.data;
  const rounds = data ? playoffRounds(data.matches) : [];
  const roundIndex = Math.min(round ?? currentRound(rounds), rounds.length - 1);
  const live = data?.matches.filter((match) => match.state === 'ACTIVE') ?? [];
  const upNext = data?.matches
    .filter(
      (match) =>
        match.state !== 'DONE' &&
        match.state !== 'ACTIVE' &&
        match.startTime != null &&
        match.participants.length > 0,
    )
    .sort((a, b) => a.startTime! - b.startTime!)[0];
  const grandFinal = data?.matches.find(
    (match) => match.name === 'Grand Finals',
  );
  const latestSeason = latest.data?.season;
  const topSeason = Math.max(currentSeason ?? 0, latestSeason ?? 0);
  const shownSeason =
    event === 'main' ? (season ?? latestSeason) : side.data?.season;
  const active = event === 'main' ? query : side;
  const eventName =
    event === 'main' ? 'playoffs bracket' : TOURNEY_NAMES[event];

  const changeSeason = (value: string) => {
    setSeason(value === 'latest' ? undefined : Number(value));
    setRound(undefined);
    setSheet(undefined);
    if (event === 'wc' && value !== String(WC_SEASON)) setEvent('main');
  };
  const refresh = () => {
    if (event !== 'main') return void side.refetch();
    void latest.refetch();
    if (season != null) void archive.refetch();
  };
  const showInBracket = (match: PlayoffMatch) => {
    setSheet(undefined);
    setRound(rounds.findIndex((round) => round.matches.includes(match)));
    setTab('bracket');
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching}
            onRefresh={refresh}
            colors={['#70a822']}
            tintColor="#a3d65c"
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <Txt accessibilityRole="header" className="text-xl">
            Playoffs
          </Txt>
          <View className="-my-3 -mr-3 flex-row">
            <LinkIcon
              label="MCSR Ranked on YouTube"
              icon="logo-youtube"
              url="https://www.youtube.com/@MCSR_Ranked/live"
            />
            <LinkIcon
              label="MCSR Ranked on Twitch"
              icon="logo-twitch"
              url="https://twitch.tv/mcsrranked"
            />
          </View>
        </View>
        <Select
          title="Season"
          value={
            event === 'wc'
              ? String(WC_SEASON)
              : season == null
                ? 'latest'
                : String(season)
          }
          onChange={changeSeason}
          options={[
            {
              label:
                season == null && shownSeason != null
                  ? `Season ${shownSeason} · Latest`
                  : 'Latest',
              value: 'latest',
            },
            ...Array.from({ length: topSeason }, (_, index) => ({
              label: `Season ${topSeason - index}`,
              value: String(topSeason - index),
            })),
          ]}
        />
        <Segments
          value={event}
          onChange={setEvent}
          options={[
            { label: 'Playoffs', value: 'main' as Event },
            { label: 'MSS', value: 'mss' as Event },
            { label: 'LCQ', value: 'lcq' as Event },
            ...(season === WC_SEASON || event === 'wc'
              ? [{ label: 'WC', value: 'wc' as Event }]
              : []),
          ]}
        />
        <RefreshWarning
          error={active.data ? active.error : null}
          retry={() => void active.refetch()}
        />
        {!active.data &&
          (isMissing(active.error) ? (
            <QueryState
              empty={
                season == null || event === 'wc'
                  ? `No ${eventName} data yet.`
                  : `No ${eventName} data for season ${season}.`
              }
            />
          ) : (
            <QueryState
              pending={active.isPending}
              error={active.error}
              retry={refresh}
            />
          ))}
        {tourney && event !== 'main' && (
          <>
            <Txt className="text-xs text-ranked-muted">
              {TOURNEY_NAMES[event]} · Season {tourney.season} ·{' '}
              {isFinished(tourney.tourney)
                ? 'Finished'
                : `Live, round ${tourney.tourney.currentRound}`}{' '}
              · {tourney.tourney.brackets.length} players
            </Txt>
            <TourneyView
              key={`${event}-${tourney.season}`}
              tourney={tourney.tourney}
            />
          </>
        )}
        {event === 'main' && data && (
          <>
            <Txt className="text-xs text-ranked-muted">
              {live.length > 0
                ? `${live.length === 1 ? 'A match is' : `${live.length} matches are`} live now`
                : grandFinal?.state === 'DONE' && grandFinal.startTime
                  ? `Finished ${shortDateTime(grandFinal.startTime)}`
                  : upNext
                    ? `Next match ${shortDateTime(upNext.startTime!)}`
                    : 'Bracket not started'}{' '}
              · {data.players.length} players
            </Txt>
            {grandFinal?.state === 'DONE' && (
              <Podium playoffs={data} onPlayer={setPlayer} />
            )}
            {live.length > 0 ? (
              <Card className="gap-3">
                <View className="flex-row items-center justify-between">
                  <LiveDot />
                  <Txt className="text-xs text-ranked-muted">
                    {live[0].name}
                  </Txt>
                </View>
                {live.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    playoffs={data}
                    onPlayer={setPlayer}
                  />
                ))}
                <ExternalButton
                  title="Watch live on Twitch"
                  url="https://twitch.tv/mcsrranked"
                  icon="logo-twitch"
                />
              </Card>
            ) : (
              upNext &&
              upNext.startTime! * 1000 > now - 3 * 3600_000 && (
                <Card className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <Txt className="font-minecraft-bold text-xs uppercase tracking-widest text-ranked-muted">
                      Up next
                    </Txt>
                    <Txt className="text-xs text-ranked-muted">
                      {upNext.name}
                    </Txt>
                  </View>
                  <MatchCard
                    match={upNext}
                    playoffs={data}
                    onPlayer={setPlayer}
                  />
                </Card>
              )
            )}
            <Segments
              value={tab}
              onChange={setTab}
              options={[
                { label: 'Bracket', value: 'bracket' },
                { label: 'Schedule', value: 'schedule' },
                { label: 'Standings', value: 'standings' },
              ]}
            />
            {tab === 'bracket' && (
              <SwipeBracket
                key={data.season}
                playoffs={data}
                initial={roundIndex}
                onPage={setRound}
                onPlayer={setPlayer}
              />
            )}
            {tab === 'schedule' && (
              <Schedule
                playoffs={data}
                onMatch={(match) => setSheet({ match: match.id })}
              />
            )}
            {tab === 'standings' && (
              <Standings playoffs={data} onPlayer={setPlayer} />
            )}
          </>
        )}
      </ScrollView>
      {data && (
        <PlayoffSheet
          playoffs={data}
          selection={sheet}
          onSelect={setSheet}
          onShowInBracket={showInBracket}
          onClose={() => setSheet(undefined)}
        />
      )}
    </SafeAreaView>
  );
}

function LinkIcon({
  label,
  icon,
  url,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  url: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void Linking.openURL(url).catch(() => {})}
      className="h-12 w-12 items-center justify-center active:opacity-70"
    >
      <Ionicons name={icon} size={22} color="#a1a1aa" />
    </Pressable>
  );
}

function Schedule({
  playoffs,
  onMatch,
}: {
  playoffs: Playoffs;
  onMatch: (match: PlayoffMatch) => void;
}) {
  const days = new Map<string, PlayoffMatch[]>();
  for (const match of playoffs.matches
    .filter((match) => match.startTime != null)
    .sort((a, b) => a.startTime! - b.startTime!)) {
    const day = new Date(match.startTime! * 1000).toLocaleDateString(
      undefined,
      { weekday: 'long', month: 'short', day: 'numeric' },
    );
    days.set(day, [...(days.get(day) ?? []), match]);
  }
  if (days.size === 0) return <QueryState empty="No matches scheduled yet." />;
  return (
    <View className="gap-5">
      {[...days].map(([day, matches]) => (
        <View key={day}>
          <Heading>{day}</Heading>
          <View className="overflow-hidden rounded-md border border-ranked-border">
            {matches.map((match, index) => (
              <ScheduleRow
                key={match.id}
                match={match}
                playoffs={playoffs}
                first={index === 0}
                onPress={() => onMatch(match)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ScheduleRow({
  match,
  playoffs,
  first,
  onPress,
}: {
  match: PlayoffMatch;
  playoffs: Playoffs;
  first: boolean;
  onPress: () => void;
}) {
  const winner = matchWinner(match);
  const names = [0, 1].map((side) => {
    const slot = match.participants[side];
    return slot?.player != null
      ? playoffs.players[slot.player]?.nickname
      : undefined;
  });
  const scores = match.participants.map((slot) => slot.roundScore ?? 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens this match"
      onPress={onPress}
      className={twMerge(
        'min-h-14 flex-row items-center gap-3 bg-ranked-surface px-3 py-2 active:bg-zinc-700',
        !first && 'border-t border-zinc-800',
      )}
    >
      <Txt className="w-16 text-xs text-ranked-muted">
        {new Date(match.startTime! * 1000).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </Txt>
      <View className="flex-1 gap-1">
        <Txt numberOfLines={1} className="text-sm">
          <Txt className={winner === 0 ? 'text-lime-300' : ''}>
            {names[0] ?? 'TBD'}
          </Txt>
          <Txt className="text-zinc-500"> vs </Txt>
          <Txt className={winner === 1 ? 'text-lime-300' : ''}>
            {names[1] ?? 'TBD'}
          </Txt>
        </Txt>
        <Txt className="text-xs text-zinc-500">{match.name}</Txt>
      </View>
      {match.state === 'ACTIVE' ? (
        <LiveDot />
      ) : match.state === 'DONE' ? (
        <Txt className="text-sm">
          {scores[0]}–{scores[1]}
        </Txt>
      ) : null}
    </Pressable>
  );
}

function Standings({
  playoffs,
  onPlayer,
}: {
  playoffs: Playoffs;
  onPlayer: (player: number) => void;
}) {
  const rows = playoffs.players
    .map((info, index) => ({
      info,
      index,
      result: playoffs.results.find((result) => result.player === index),
    }))
    .sort(
      (a, b) =>
        (a.result?.place ?? Infinity) - (b.result?.place ?? Infinity) ||
        a.info.seedNumber - b.info.seedNumber,
    );
  return (
    <View className="overflow-hidden rounded-md border border-ranked-border">
      {rows.map(({ info, index, result }, rowIndex) => (
        <Pressable
          key={info.uuid}
          accessibilityRole="button"
          accessibilityLabel={`${result ? `${placeLabel(playoffs, result.place)} place, ` : ''}${info.nickname}, seed ${info.seedNumber + 1}`}
          onPress={() => onPlayer(index)}
          className={twMerge(
            'min-h-16 flex-row items-center gap-3 bg-ranked-surface px-3 py-3 active:bg-zinc-700',
            rowIndex > 0 && 'border-t border-zinc-800',
          )}
        >
          <Txt
            numberOfLines={1}
            adjustsFontSizeToFit
            className={twMerge(
              'w-16 text-xs text-zinc-500',
              result?.place === 1 && 'text-yellow-300',
              result?.place === 2 && 'text-zinc-200',
              result?.place === 3 && 'text-orange-300',
            )}
          >
            {result ? placeLabel(playoffs, result.place) : '–'}
          </Txt>
          <Avatar uuid={info.uuid} />
          <View className="flex-1">
            <Txt numberOfLines={1} className="text-sm">
              {info.nickname}
            </Txt>
            <Txt className="mt-1 text-xs text-zinc-500">
              Seed #{info.seedNumber + 1}
              {info.seasonEloRate != null ? ` · ${info.seasonEloRate} elo` : ''}
            </Txt>
          </View>
          {result && result.prize > 0 && (
            <Txt className="text-sm text-lime-300">{prize(result.prize)}</Txt>
          )}
        </Pressable>
      ))}
    </View>
  );
}
