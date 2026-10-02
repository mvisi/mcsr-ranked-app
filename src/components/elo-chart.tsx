import SvgChart, {
  SVGRenderer,
  type ChartElement,
} from '@wuba/react-native-echarts/svgChart';
import { LineChart, type LineSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  type GridComponentOption,
  type TooltipComponentOption,
  type VisualMapComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import type { Match } from 'mcsrranked-sdk';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Heading, Txt } from '@/components/ui';
import { RANKS, rankTier } from '@/lib/format';
import { outcome, signed } from '@/lib/matches';

echarts.use([
  SVGRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
]);

const CHART_HEIGHT = 180;
type EloPoint = {
  value: number;
  change: number;
  label: string;
  result: ReturnType<typeof outcome>;
};
type EloChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
>;

const EloPlot = memo(
  function EloPlot({ points }: { points: EloPoint[] }) {
    const host = useRef<ChartElement>(null);
    const chart = useRef<echarts.ECharts>(null);
    const selectedIndex = useRef<number | null>(null);
    const touchOrigin = useRef({ x: 0, pageX: 0, pageY: 0 });
    const [width, setWidth] = useState(0);
    const [selection, setSelection] = useState<{
      point: EloPoint;
      x: number;
      width: number;
    } | null>(null);
    const selected =
      selection?.width === width && points.includes(selection.point)
        ? selection
        : null;
    const tooltipWidth = Math.min(208, Math.max(0, width - 16));
    const tooltipLeft = selected
      ? Math.max(
          8,
          Math.min(
            width - tooltipWidth - 8,
            selected.x > width / 2
              ? selected.x - tooltipWidth - 12
              : selected.x + 12,
          ),
        )
      : 0;
    const selectAt = useCallback(
      (x: number) => {
        const instance = chart.current;
        if (!instance) return;
        const position = instance.convertFromPixel({ xAxisIndex: 0 }, x);
        const index = Number.isFinite(position)
          ? Math.max(0, Math.min(points.length - 1, Math.round(position)))
          : points.length - 1;
        if (selectedIndex.current === index) return;
        selectedIndex.current = index;
        const pixel = instance.convertToPixel({ xAxisIndex: 0 }, index);
        setSelection({
          point: points[index],
          x: Number.isFinite(pixel) ? pixel : x,
          width,
        });
        instance.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          dataIndex: index,
        });
      },
      [points, width],
    );
    const option = useMemo<EloChartOption>(() => {
      const values = points.map((point) => point.value);
      const low = Math.min(...values);
      const high = Math.max(...values);
      const padding = Math.max((high - low) * 0.15, 10);

      return {
        animation: false,
        tooltip: {
          trigger: 'axis',
          triggerOn: 'none',
          renderMode: 'richText',
          alwaysShowContent: true,
          // Use a native card for typography and outcome colors; ECharts draws the marker.
          showContent: false,
          axisPointer: {
            type: 'line',
            axis: 'x',
            snap: true,
            lineStyle: { color: '#d4d4d8', width: 1, type: 'solid' },
            label: { show: false },
          },
        },
        grid: { left: 4, right: 48, top: 12, bottom: 12 },
        xAxis: {
          type: 'value',
          min: 0,
          max: values.length - 1,
          show: false,
        },
        yAxis: {
          type: 'value',
          position: 'right',
          min: Math.floor((low - padding) / 10) * 10,
          max: Math.ceil((high + padding) / 10) * 10,
          splitNumber: 3,
          minInterval: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#a1a1aa', fontSize: 10, margin: 10 },
          splitLine: { lineStyle: { color: '#3f3f46', type: 'dashed' } },
        },
        visualMap: {
          type: 'piecewise',
          show: false,
          dimension: 1,
          pieces: RANKS.map((rank, index) => ({
            ...(index > 0 ? { gte: rank.tiers[0] } : {}),
            ...(RANKS[index + 1] ? { lt: RANKS[index + 1].tiers[0] } : {}),
            color: rank.color,
          })),
        },
        series: [
          {
            type: 'line',
            data: values.map((value, index) => [index, value]),
            showSymbol: false,
            silent: true,
            lineStyle: { width: 3, cap: 'round', join: 'round' },
            areaStyle: { opacity: 0.06 },
          },
        ],
      };
    }, [points]);

    useEffect(() => {
      if (!host.current || width <= 0) return;
      // The wrapper implements ECharts' DOM host interface on native.
      const instance = echarts.init(
        host.current as unknown as HTMLElement,
        null,
        {
          renderer: 'svg',
          width,
          height: CHART_HEIGHT,
        },
      );
      chart.current = instance;
      return () => {
        instance.dispose();
        chart.current = null;
      };
    }, [width]);

    useEffect(() => {
      chart.current?.setOption(option, { notMerge: true });
      selectedIndex.current = null;
    }, [option, width]);

    return (
      <View
        onStartShouldSetResponderCapture={({ nativeEvent }) => {
          touchOrigin.current = {
            x: nativeEvent.locationX,
            pageX: nativeEvent.pageX,
            pageY: nativeEvent.pageY,
          };
          return false;
        }}
        onMoveShouldSetResponderCapture={({ nativeEvent }) => {
          // Claim horizontal drags; vertical swipes can scroll the player screen.
          const dx = Math.abs(nativeEvent.pageX - touchOrigin.current.pageX);
          const dy = Math.abs(nativeEvent.pageY - touchOrigin.current.pageY);
          return nativeEvent.touches.length === 1 && dx > 6 && dx > dy;
        }}
        onResponderGrant={({ nativeEvent }) => selectAt(nativeEvent.locationX)}
        onResponderMove={({ nativeEvent }) => {
          if (nativeEvent.touches.length === 1) {
            selectAt(
              touchOrigin.current.x +
                nativeEvent.pageX -
                touchOrigin.current.pageX,
            );
          }
        }}
        onResponderTerminationRequest={() => false}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height: CHART_HEIGHT }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elo chart"
          accessibilityHint="Tap or drag horizontally to show a match's Elo and opponent."
          onPress={({ nativeEvent }) => selectAt(nativeEvent.locationX)}
          style={{ height: CHART_HEIGHT }}
        >
          <View pointerEvents="none">
            {width > 0 && (
              <SvgChart
                ref={host}
                handleGesture={false}
                style={{ width, height: CHART_HEIGHT }}
              />
            )}
          </View>
        </Pressable>
        {selected && (
          <View
            pointerEvents="none"
            accessible
            accessibilityLabel={`${selected.point.value} Elo, ${signed(selected.point.change)} Elo change, ${selected.point.result.title}, ${selected.point.label}`}
            className="absolute top-2 gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5"
            style={{ left: tooltipLeft, width: tooltipWidth }}
          >
            <View className="flex-row items-baseline justify-between gap-2">
              <View className="flex-row items-baseline gap-1">
                <Txt className="font-minecraft-bold text-lg">
                  {selected.point.value}
                </Txt>
                <Txt className="text-[10px] text-zinc-400">Elo</Txt>
              </View>
              <Txt
                className="text-xs"
                style={{ color: selected.point.result.color }}
              >
                {signed(selected.point.change)} Elo
              </Txt>
            </View>
            <View className="flex-row items-center gap-2">
              <View
                className="rounded px-1.5 py-0.5"
                style={{ backgroundColor: `${selected.point.result.color}18` }}
              >
                <Txt
                  className="text-[10px]"
                  style={{ color: selected.point.result.color }}
                >
                  {selected.point.result.title}
                </Txt>
              </View>
              <Txt className="flex-1 text-xs text-zinc-300" numberOfLines={1}>
                {selected.point.label}
              </Txt>
            </View>
          </View>
        )}
      </View>
    );
  },
  (previous, next) =>
    previous.points.length === next.points.length &&
    previous.points.every(
      (point, index) =>
        point.value === next.points[index].value &&
        point.change === next.points[index].change &&
        point.label === next.points[index].label &&
        point.result.title === next.points[index].result.title &&
        point.result.color === next.points[index].result.color,
    ),
);

export function EloChart({
  matches,
  uuid,
}: {
  matches: Match[];
  uuid: string;
}) {
  const points = useMemo<EloPoint[]>(
    () =>
      matches
        .flatMap((match) => {
          const change = match.changes.find((change) => change.uuid === uuid);
          if (change?.eloRate == null || change.change == null) return [];
          return [
            {
              value: change.eloRate + change.change,
              change: change.change,
              result: outcome(match, uuid),
              label: match.decayed
                ? 'Rank decay'
                : `vs ${match.players.find((player) => player.uuid !== uuid)?.nickname ?? 'Unknown'}`,
            },
          ];
        })
        .reverse(),
    [matches, uuid],
  );
  if (points.length < 2) return null;
  const values = points.map((point) => point.value);
  const latest = values.at(-1)!;
  const net = latest - values[0];
  const rank = rankTier(latest);

  return (
    <Card>
      <Heading>Recent Elo</Heading>
      <View>
        <View
          accessible
          accessibilityLabel={`Elo over the last ${points.length} rated matches, from ${values[0]} to ${latest}, ranging from ${Math.min(...values)} to ${Math.max(...values)}`}
          className="mb-2 flex-row items-end justify-between gap-3"
        >
          <View className="flex-row items-baseline gap-2">
            <Txt
              className="font-minecraft-bold text-2xl"
              style={{ color: rank.color }}
            >
              {latest}
            </Txt>
            <Txt className="text-xs text-ranked-muted">Elo</Txt>
          </View>
          <Txt className="text-xs text-ranked-muted">{signed(net)} Elo</Txt>
        </View>
        <EloPlot points={points} />
        <View className="mt-2 flex-row justify-between">
          <Txt className="text-xs text-ranked-muted">
            {points.length - 1} matches ago
          </Txt>
          <Txt className="text-xs text-ranked-muted">Latest</Txt>
        </View>
      </View>
    </Card>
  );
}
