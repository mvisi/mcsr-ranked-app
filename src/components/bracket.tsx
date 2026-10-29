import { useMemo, type ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { MATCH_CARD_HEIGHT, MatchCard } from '@/components/playoffs';
import { Txt } from '@/components/ui';
import {
  feedsInto,
  playoffRounds,
  type PlayoffMatch,
  type PlayoffRound,
  type Playoffs,
} from '@/lib/playoffs';

const GAP = 12; // between stacked cards
const SLOT = MATCH_CARD_HEIGHT + GAP;
const LANE = 24; // between columns, where the connector lines run
const PEEK = 40; // how much of the neighbouring round shows at the side
const EDGE = 16; // matches the screen padding
const TITLE = 36;
const LINE = 1.5;
const LINE_COLOR = '#52525b';

// A round's level is how many times the field has halved. Rounds after the
// current page spread by 2^(level gap), so each match sits centred between
// the two that feed it.
type Geometry = { pages: number[]; levels: number[] };

type Point = { round: number; index: number; third?: boolean };

function spread(geometry: Geometry, round: number, progress: number) {
  'worklet';
  const current = interpolate(
    progress,
    geometry.pages,
    geometry.levels,
    Extrapolation.CLAMP,
  );
  return Math.max(1, Math.pow(2, geometry.levels[round] - current));
}

function cardTop(geometry: Geometry, point: Point, progress: number) {
  'worklet';
  const factor = spread(geometry, point.round, progress);
  // The 3rd place match rides one slot under the final.
  const index = point.third ? 0 : point.index;
  return (index * factor + (factor - 1) / 2) * SLOT + (point.third ? SLOT : 0);
}

function cardCentre(geometry: Geometry, point: Point, progress: number) {
  'worklet';
  return cardTop(geometry, point, progress) + MATCH_CARD_HEIGHT / 2;
}

function mainMatches(round: PlayoffRound) {
  return round.matches.filter((match) => match.name !== '3rd Place');
}

export function SwipeBracket({
  playoffs,
  initial,
  onPage,
  onPlayer,
}: {
  playoffs: Playoffs;
  initial: number;
  onPage: (page: number) => void;
  onPlayer: (player: number) => void;
}) {
  const rounds = playoffRounds(playoffs.matches);
  const last = rounds.length - 1;
  // Not onLayout, which would place the cards from a width of 0 at first.
  const width = useWindowDimensions().width;
  const progress = useSharedValue(initial);
  const start = useSharedValue(initial);
  const column = last === 0 ? width - EDGE * 2 : width - EDGE - PEEK;
  // The last page has no next round to peek at, so it shifts right to show
  // the previous round's lines instead.
  const offsets = rounds.map(
    (_, index) => (index === last && last > 0 ? PEEK : EDGE) - index * column,
  );
  const trackX = offsets.length > 1 ? offsets : [offsets[0], offsets[0]];

  const first = mainMatches(rounds[0]).length;
  const levels = rounds.map((round) =>
    Math.log2(first / Math.max(1, mainMatches(round).length)),
  );
  // `interpolate` needs two points, so a single round repeats itself.
  const geometry: Geometry =
    rounds.length > 1
      ? { pages: rounds.map((_, index) => index), levels }
      : { pages: [0, 1], levels: [levels[0], levels[0]] };

  // The tallest column from each page onwards. Earlier rounds are off screen.
  const pageHeights = rounds.map((_, page) =>
    Math.max(
      ...rounds.slice(page).map((round, offset) => {
        const index = page + offset;
        const lastMatch = mainMatches(round).length - 1;
        const third = round.matches.length > mainMatches(round).length;
        return (
          cardTop(geometry, { round: index, index: lastMatch, third }, page) +
          MATCH_CARD_HEIGHT
        );
      }),
    ),
  );
  const heights =
    pageHeights.length > 1 ? pageHeights : [pageHeights[0], pageHeights[0]];
  const tallest = Math.max(...pageHeights);

  const settle = (page: number, velocity = 0) => {
    'worklet';
    progress.value = withSpring(
      page,
      { velocity, damping: 28, stiffness: 260, overshootClamping: true },
      (finished) => {
        if (finished) scheduleOnRN(onPage, page);
      },
    );
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onStart(() => {
          cancelAnimation(progress);
          start.value = progress.value;
        })
        .onUpdate((event) => {
          const raw = start.value - event.translationX / column;
          progress.value =
            raw < 0 ? raw * 0.3 : raw > last ? last + (raw - last) * 0.3 : raw;
        })
        .onEnd((event) => {
          const from = Math.round(start.value);
          const flick =
            Math.abs(event.velocityX) > 400 ? -Math.sign(event.velocityX) : 0;
          const target = flick ? from + flick : Math.round(progress.value);
          const lowest = Math.max(0, from - 1);
          const highest = Math.min(last, from + 1);
          settle(
            Math.min(highest, Math.max(lowest, target)),
            -event.velocityX / column,
          );
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [column, last, onPage],
  );

  const frame = useAnimatedStyle(() => ({
    height:
      TITLE +
      interpolate(progress.value, geometry.pages, heights, Extrapolation.CLAMP),
  }));
  const track = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, geometry.pages, trackX),
      },
    ],
  }));

  return (
    <View className="-mx-4">
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ overflow: 'hidden' }, frame]}>
          {/* Fixed size, so only the frame above resizes. */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: column * rounds.length,
                height: TITLE + tallest,
                flexDirection: 'row',
              },
              track,
            ]}
          >
            {rounds.map((round, index) => (
              <View key={round.title} style={{ width: column }}>
                <RoundTitle
                  title={round.title}
                  index={index}
                  progress={progress}
                  onPress={() => settle(index)}
                />
                <View style={{ height: tallest }}>
                  {round.matches.map((match) => {
                    const third = match.name === '3rd Place';
                    return (
                      <PlacedCard
                        key={match.id}
                        geometry={geometry}
                        point={{
                          round: index,
                          index: third ? 0 : mainMatches(round).indexOf(match),
                          third,
                        }}
                        progress={progress}
                        right={index === last ? 0 : LANE}
                      >
                        <MatchCard
                          match={match}
                          playoffs={playoffs}
                          onPlayer={onPlayer}
                          title={
                            match.name === 'Grand Finals'
                              ? 'Grand final'
                              : third
                                ? '3rd place'
                                : undefined
                          }
                        />
                      </PlacedCard>
                    );
                  })}
                  {rounds[index + 1] &&
                    mainMatches(rounds[index + 1]).map((target, slot) => (
                      <Connector
                        key={target.id}
                        geometry={geometry}
                        feeders={feederPoints(round, index, target)}
                        target={{ round: index + 1, index: slot }}
                        progress={progress}
                        fades={index + 1 < last}
                      />
                    ))}
                </View>
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function feederPoints(
  round: PlayoffRound,
  index: number,
  target: PlayoffMatch,
): Point[] {
  return mainMatches(round).flatMap((match, slot) =>
    feedsInto(match, target) ? [{ round: index, index: slot }] : [],
  );
}

function RoundTitle({
  title,
  index,
  progress,
  onPress,
}: {
  title: string;
  index: number;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View style={[{ height: TITLE }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Show ${title}`}
        onPress={onPress}
        className="self-start pb-3 pr-4"
      >
        <Txt className="font-minecraft-bold text-xs uppercase tracking-widest text-zinc-300">
          {title}
        </Txt>
      </Pressable>
    </Animated.View>
  );
}

function PlacedCard({
  geometry,
  point,
  progress,
  right,
  children,
}: {
  geometry: Geometry;
  point: Point;
  progress: SharedValue<number>;
  right: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    top: cardTop(geometry, point, progress.value),
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right }, style]}>
      {children}
    </Animated.View>
  );
}

function Connector({
  geometry,
  feeders,
  target,
  progress,
  fades,
}: {
  geometry: Geometry;
  feeders: Point[];
  target: Point;
  progress: SharedValue<number>;
  fades: boolean;
}) {
  // Passed columns hug the left edge, so their lines fade out.
  const column = target.round - 1;
  const fade = useAnimatedStyle(() => ({
    opacity: fades
      ? interpolate(
          progress.value,
          [column + 0.5, column + 1],
          [1, 0],
          Extrapolation.CLAMP,
        )
      : 1,
  }));
  if (feeders.length === 0) return null;
  const points = [...feeders, target];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, bottom: 0, right: 0, width: LANE },
        fade,
      ]}
    >
      {feeders.map((point) => (
        <Stub
          key={point.index}
          geometry={geometry}
          point={point}
          progress={progress}
          left={0}
        />
      ))}
      <Spine geometry={geometry} points={points} progress={progress} />
      <Stub
        geometry={geometry}
        point={target}
        progress={progress}
        left={LANE / 2}
      />
    </Animated.View>
  );
}

function Stub({
  geometry,
  point,
  progress,
  left,
}: {
  geometry: Geometry;
  point: Point;
  progress: SharedValue<number>;
  left: number;
}) {
  const style = useAnimatedStyle(() => ({
    top: cardCentre(geometry, point, progress.value) - LINE / 2,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          width: LANE / 2,
          height: LINE,
          backgroundColor: LINE_COLOR,
        },
        style,
      ]}
    />
  );
}

function Spine({
  geometry,
  points,
  progress,
}: {
  geometry: Geometry;
  points: Point[];
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const centres = points.map((point) =>
      cardCentre(geometry, point, progress.value),
    );
    const top = Math.min(...centres);
    return { top: top - LINE / 2, height: Math.max(...centres) - top + LINE };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: LANE / 2 - LINE / 2,
          width: LINE,
          backgroundColor: LINE_COLOR,
        },
        style,
      ]}
    />
  );
}
