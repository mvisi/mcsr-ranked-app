import { ranked } from '@/lib/api';

// The SDK has no playoffs resource, so these mirror `/playoffs/{season}`.
export type PlayoffPlayer = {
  uuid: string;
  nickname: string;
  seasonEloRate: number | null;
  seasonEloRank: number | null;
  seedNumber: number;
  personalBest: number | null;
};

export type PlayoffMatch = {
  id: number;
  name: string;
  nextMatchId: number | null;
  maxRoundScore: number;
  startTime: number | null;
  state: 'SCHEDULED' | 'ACTIVE' | 'DONE' | null;
  // `player` indexes into `Playoffs['players']`. Empty slots are left out.
  participants: { player: number | null; roundScore: number | null }[];
  vod: string | null;
};

export type Playoffs = {
  type: string;
  season: number;
  players: PlayoffPlayer[];
  matches: PlayoffMatch[];
  results: { player: number | null; place: number; prize: number }[];
};

export type PlayoffRound = { title: string; matches: PlayoffMatch[] };

export async function getPlayoffs(season?: number) {
  const response = await ranked.request<{
    data: Playoffs;
    next: number | null;
    prev: number | null;
  }>(season == null ? 'playoffs' : `playoffs/${season}`);
  return response.data;
}

const FINALS = ['Grand Finals', '3rd Place'];

/** The final and 3rd place match share the last round. */
export function playoffRounds(matches: PlayoffMatch[]): PlayoffRound[] {
  // The API lists matches from the final backwards.
  const names = [...new Set(matches.map((match) => match.name))].reverse();
  const byId = (a: PlayoffMatch, b: PlayoffMatch) => a.id - b.id;
  const rounds = names
    .filter((name) => !FINALS.includes(name))
    .map((name) => ({
      title: name,
      matches: matches.filter((match) => match.name === name).sort(byId),
    }));
  const finals = matches
    .filter((match) => FINALS.includes(match.name))
    .sort(byId);
  if (finals.length) rounds.push({ title: 'Finals', matches: finals });
  // Order by where winners go next, so feeders of a match sit together.
  for (let index = rounds.length - 2; index >= 0; index--) {
    const next = rounds[index + 1].matches;
    const slot = (match: PlayoffMatch) => {
      const position = next.findIndex((other) => feedsInto(match, other));
      return position === -1 ? Infinity : position;
    };
    rounds[index].matches.sort((a, b) => slot(a) - slot(b) || a.id - b.id);
  }
  return rounds;
}

/** Older seasons have no `nextMatchId`, so this looks for the winner instead. */
export function feedsInto(match: PlayoffMatch, target: PlayoffMatch) {
  if (match.nextMatchId != null) return match.nextMatchId === target.id;
  if (target.name === '3rd Place') return false;
  const winner = match.participants[matchWinner(match)]?.player;
  return (
    winner != null && target.participants.some((slot) => slot.player === winner)
  );
}

export function currentRound(rounds: PlayoffRound[]) {
  const live = rounds.findIndex((round) =>
    round.matches.some((match) => match.state === 'ACTIVE'),
  );
  if (live >= 0) return live;
  const upcoming = rounds.findIndex((round) =>
    round.matches.some(
      (match) => match.state !== 'DONE' && match.startTime != null,
    ),
  );
  return upcoming >= 0 ? upcoming : rounds.length - 1;
}

export function matchWinner(match: PlayoffMatch) {
  const [first, second] = match.participants;
  if (first?.roundScore === match.maxRoundScore) return 0;
  if (second?.roundScore === match.maxRoundScore) return 1;
  return -1;
}

/** A lone player who moved on without playing. */
export function isWalkover(match: PlayoffMatch, matches: PlayoffMatch[]) {
  const [only] = match.participants;
  if (match.participants.length !== 1 || match.state === 'DONE' || !only)
    return false;
  const next = matches.find((other) => other.id === match.nextMatchId);
  return !!next?.participants.some((slot) => slot.player === only.player);
}

export function playerRun(playoffs: Playoffs, player: number) {
  return playoffRounds(playoffs.matches).flatMap((round) =>
    round.matches
      .filter((match) =>
        match.participants.some((slot) => slot.player === player),
      )
      .map((match) => {
        const side = match.participants.findIndex(
          (slot) => slot.player === player,
        );
        const opponent = match.participants[1 - side];
        const winner = matchWinner(match);
        return {
          match,
          side,
          opponent:
            opponent?.player != null
              ? playoffs.players[opponent.player]
              : undefined,
          result:
            winner === -1
              ? undefined
              : winner === side
                ? ('won' as const)
                : ('lost' as const),
        };
      }),
  );
}

export function ordinal(place: number) {
  const tens = place % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[
          place % 10
        ] ?? 'th');
  return `${place}${suffix}`;
}

export function placeLabel(playoffs: Playoffs, place: number) {
  const shared = playoffs.results.filter(
    (result) => result.place === place,
  ).length;
  return shared > 1
    ? `${ordinal(place)}–${ordinal(place + shared - 1)}`
    : ordinal(place);
}

export function prize(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  });
}
