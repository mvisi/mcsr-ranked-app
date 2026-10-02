import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchTimeline } from '@/components/match-timeline';
import { SeedBadges } from '@/components/seed-badges';
import {
  Card,
  ExternalButton,
  Heading,
  QueryState,
  Txt,
} from '@/components/ui';
import { ranked } from '@/lib/api';
import { dateTime, duration } from '@/lib/format';

export default function MatchScreen() {
  const { id, viewer } = useLocalSearchParams<{
    id: string;
    viewer?: string;
  }>();
  const numericId = Number(id);
  const valid = Number.isInteger(numericId) && numericId > 0;
  const match = useQuery({
    queryKey: ['match', numericId],
    queryFn: () => ranked.matches.get(numericId),
    enabled: valid,
  });
  const data = match.data;
  const details = [
    data?.beginner ? 'Beginner mode' : null,
    data?.rank.allTime ? `All-time #${data.rank.allTime}` : null,
    data?.rank.season ? `Season #${data.rank.season}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
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
              <SeedBadges
                overworld={data.seed?.overworld ?? data.seedType}
                nether={data.seed?.nether ?? data.bastionType}
              />
              <MatchTimeline match={data} viewer={viewer} />
              {details.length > 0 && (
                <Txt className="text-xs text-ranked-muted">{details}</Txt>
              )}
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
