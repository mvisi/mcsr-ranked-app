import type { Match } from 'mcsrranked-sdk';
import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { Card, Heading, Txt } from '@/components/ui';

export function EloChart({
  matches,
  uuid,
}: {
  matches: Match[];
  uuid: string;
}) {
  const changes = matches
    .map((match) => match.changes.find((change) => change.uuid === uuid))
    .filter((change) => change?.eloRate != null && change.change != null)
    .reverse();
  if (changes.length < 2) return null;
  const values = [
    changes[0]!.eloRate!,
    ...changes.map((change) => change!.eloRate! + change!.change!),
  ];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const spread = Math.max(high - low, 20);
  const points = values
    .map(
      (value, index) =>
        `${8 + (index / (values.length - 1)) * 284},${120 - ((value - low) / spread) * 100}`,
    )
    .join(' ');
  return (
    <Card>
      <Heading>Recent Elo</Heading>
      <View
        accessible
        accessibilityLabel={`Elo over the last ${changes.length} rated matches, from ${values[0]} to ${values.at(-1)}, ranging from ${low} to ${high}`}
      >
        <View className="flex-row justify-between">
          <Txt className="text-xs text-ranked-muted">{high}</Txt>
          <Txt className="text-xs text-lime-300">{values.at(-1)} Elo</Txt>
        </View>
        <Svg
          width="100%"
          height={140}
          viewBox="0 0 300 140"
          accessibilityElementsHidden
        >
          <Line
            x1="8"
            x2="292"
            y1="20"
            y2="20"
            stroke="#3f3f46"
            strokeDasharray="4 4"
          />
          <Line
            x1="8"
            x2="292"
            y1="120"
            y2="120"
            stroke="#3f3f46"
            strokeDasharray="4 4"
          />
          <Polyline
            points={points}
            fill="none"
            stroke="#a3d65c"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </Svg>
        <View className="flex-row justify-between">
          <Txt className="text-xs text-zinc-500">
            {low} · {changes.length} matches ago
          </Txt>
          <Txt className="text-xs text-zinc-500">Latest</Txt>
        </View>
      </View>
    </Card>
  );
}
