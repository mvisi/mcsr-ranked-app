import {
  focusManager,
  onlineManager,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { Match, MatchSort } from 'mcsrranked-sdk';
import { useCallback, useEffect, useMemo } from 'react';

import { ranked } from '@/lib/api';

export const MATCH_PAGE_SIZE = 30;

export async function refreshMatches(client: QueryClient, queryKey: QueryKey) {
  // A pending older page must not restore discarded history after refresh.
  await client.cancelQueries({ queryKey, exact: true });
  const updatedAt = client.getQueryState(queryKey)?.dataUpdatedAt;
  client.setQueryData<InfiniteData<Match[], number | undefined>>(
    queryKey,
    (data) =>
      data && {
        pages: data.pages.slice(0, 1),
        pageParams: data.pageParams.slice(0, 1),
      },
    { updatedAt },
  );
  await client.refetchQueries({ queryKey, exact: true, type: 'active' });
}

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
  const client = useQueryClient();
  const queryKey = useMemo(
    () => ['matches', name, opponent ?? null, season, type, sort],
    [name, opponent, season, type, sort],
  );
  const enabled = !!name && season != null;
  const query = useInfiniteQuery({
    queryKey,
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
    enabled,
    // Route background refreshes through the same first-page reset as pull-to-refresh.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // "before" means the next page in the requested sort, including oldest/fastest.
    getNextPageParam: (page, _pages, cursor) => {
      const next = page.at(-1)?.id;
      return page.length === MATCH_PAGE_SIZE && next !== cursor
        ? next
        : undefined;
    },
  });
  const refresh = useCallback(
    () => (enabled ? refreshMatches(client, queryKey) : Promise.resolve()),
    [client, queryKey, enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    const refreshIfStale = () => {
      const cached = client.getQueryCache().find({ queryKey, exact: true });
      if (
        onlineManager.isOnline() &&
        cached?.state.data &&
        cached.state.fetchStatus === 'idle' &&
        cached.isStale()
      ) {
        void refresh();
      }
    };
    refreshIfStale();
    const unfocus = focusManager.subscribe((focused) => {
      if (focused) refreshIfStale();
    });
    const disconnect = onlineManager.subscribe((online) => {
      if (online) refreshIfStale();
    });
    return () => {
      unfocus();
      disconnect();
    };
  }, [client, queryKey, enabled, refresh]);

  const rows = useMemo(
    () => uniqueMatches(query.data?.pages),
    [query.data?.pages],
  );
  return { ...query, rows, refresh };
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
