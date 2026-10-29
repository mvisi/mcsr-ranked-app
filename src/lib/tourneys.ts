import { useQuery } from '@tanstack/react-query';
import { RankedError } from 'mcsrranked-sdk';

import { ranked } from '@/lib/api';

export type TourneyType = 'mss' | 'lcq' | 'wc';

export const TOURNEY_NAMES: Record<TourneyType, string> = {
  mss: 'Midseason Showdown',
  lcq: 'Last Chance Qualifiers',
  wc: 'World Championship Qualifiers',
};

export const WC_SEASON = 10;

// Every event so far has run 10. The API only lists rounds that have started.
const ROUNDS = 10;

export type TourneyEntry = {
  rank: number;
  prevRank: number;
  uuid: string;
  // One slot per round. null means the player did not finish that round.
  completions: ({ place: number; score: number } | null)[];
  // Includes bonus.
  point: number;
  bonus: number;
  eliminated: boolean;
};

export type TourneyPlayer = {
  uuid: string;
  nickname: string;
  eloRate: number | null;
  eloRank: number | null;
  country: string | null;
};

export type Tourney = {
  matches: number[];
  currentRound: number;
  brackets: TourneyEntry[];
  players: TourneyPlayer[];
};

function tourneyPath(type: TourneyType, season: number) {
  if (type === 'wc') return 'tourneys/wc_2026';
  return `tourneys/${type === 'mss' ? 'showdown' : 'qualifiers'}_s${season}`;
}

/** The API answers 400 for seasons without this event, or before it starts. */
export function isMissing(error: unknown) {
  return error instanceof RankedError && error.status === 400;
}

export function isFinished(tourney: Tourney) {
  return (
    tourney.matches.length >= ROUNDS &&
    tourney.currentRound > tourney.matches.length
  );
}

/** For "Latest", falls back to the previous season until the current one has data. */
export function useTourney(
  type: TourneyType | undefined,
  season: number | undefined,
  currentSeason: number | undefined,
) {
  return useQuery({
    queryKey: ['tourney', type, season ?? 'latest', currentSeason],
    enabled: type != null && (season != null || currentSeason != null),
    queryFn: async () => {
      const get = async (number: number) => ({
        season: type === 'wc' ? WC_SEASON : number,
        tourney: await ranked.request<Tourney>(tourneyPath(type!, number)),
      });
      if (season != null) return get(season);
      try {
        return await get(currentSeason!);
      } catch (error) {
        if (isMissing(error) && currentSeason! > 1)
          return get(currentSeason! - 1);
        throw error;
      }
    },
    refetchInterval: (query) => {
      const tourney = query.state.data?.tourney;
      return tourney && !isFinished(tourney) ? 30_000 : false;
    },
  });
}

export function tourneyRounds(tourney: Tourney) {
  return tourney.matches.map((matchId, index) => ({
    number: index + 1,
    matchId,
    finishers: tourney.brackets
      .flatMap((entry) => {
        const completion = entry.completions[index];
        return completion ? [{ entry, ...completion }] : [];
      })
      .sort((a, b) => a.place - b.place),
  }));
}

export type TourneyRound = ReturnType<typeof tourneyRounds>[number];
