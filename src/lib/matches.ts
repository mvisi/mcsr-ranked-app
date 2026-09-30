import { useInfiniteQuery } from '@tanstack/react-query';
import type { Match, MatchSort } from 'mcsrranked-sdk';

import { ranked } from '@/lib/api';

export const MATCH_PAGE_SIZE = 30;

export function useMatches({
  name,
  opponent,
  season,
  type = 2,
  sort = 'newest',
}: {
  name: string;
  opponent?: string;
  season: number | undefined;
  type?: number;
  sort?: MatchSort;
}) {
  return useInfiniteQuery({
    queryKey: ['matches', name, opponent ?? null, season, type, sort],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => {
      const options = {
        season,
        type,
        sort,
        count: MATCH_PAGE_SIZE,
        before: pageParam,
      };
      return opponent
        ? ranked.versus.matches(name, opponent, options)
        : ranked.users.matches(name, options);
    },
    enabled: !!name && season != null,
    // "before" means the next page in the requested sort, including oldest/fastest.
    getNextPageParam: (page, _pages, cursor) => {
      const next = page.at(-1)?.id;
      return page.length === MATCH_PAGE_SIZE && next !== cursor
        ? next
        : undefined;
    },
  });
}

export function uniqueMatches(pages: Match[][] | undefined) {
  return [...new Map(pages?.flat().map((match) => [match.id, match])).values()];
}

export function outcome(match: Match, uuid?: string) {
  if (match.decayed) return { title: 'Decay', color: '#a1a1aa' };
  if (!match.result.uuid) return { title: 'Draw', color: '#facc15' };
  if (!uuid) return { title: 'Completed', color: '#a1a1aa' };
  return match.result.uuid === uuid
    ? { title: 'Won', color: '#a3d65c' }
    : { title: 'Lost', color: '#f87171' };
}

export function signed(value: number | null | undefined) {
  return value == null ? 'Placement' : `${value > 0 ? '+' : ''}${value}`;
}
