import type { MatchDetail } from 'mcsrranked-sdk';

type Checkpoint = {
  key: string;
  name: string;
  time: number;
  color: string;
};

export type TimelineSplit = {
  key: string;
  name: string;
  start: number;
  end: number;
  time: number;
  color: string;
};

export type PlayerTimeline = {
  player: MatchDetail['players'][number];
  completionTime: number | undefined;
  lastSplitTime: number | undefined;
  furthestMilestone: string | undefined;
  furthestMilestoneTime: number | undefined;
  furthestProgress: number;
  checkpoints: Checkpoint[];
  splits: TimelineSplit[];
};

const events: Record<
  string,
  { name: string; color?: string; progress?: number }
> = {
  'projectelo.timeline.reset': { name: 'reset', color: '#55ee55' },
  'story.enter_the_nether': {
    name: 'nether enter',
    color: '#ff5555',
    progress: 1,
  },
  'nether.find_bastion': { name: 'bastion', color: '#111111', progress: 2 },
  'nether.find_fortress': { name: 'fortress', color: '#660000', progress: 3 },
  'nether.obtain_blaze_rod': {
    name: 'first rod',
    color: '#660000',
    progress: 4,
  },
  'projectelo.timeline.blind_travel': {
    name: 'blind',
    color: '#7755ee',
    progress: 5,
  },
  'story.follow_ender_eye': {
    name: 'stronghold',
    color: '#77aa88',
    progress: 6,
  },
  'story.enter_the_end': { name: 'end enter', color: '#dbdeab', progress: 7 },
  'projectelo.timeline.dragon_death': { name: 'dragon death', progress: 8 },
  'projectelo.timeline.death': { name: 'death' },
  'projectelo.timeline.forfeit': { name: 'forfeit', color: '#ef4444' },
};

const splitNames: Record<string, string> = {
  'start → nether enter': 'overworld',
  'nether enter → bastion': 'terrain to bastion',
  'stronghold → end enter': 'stronghold nav',
};

export function matchTimeline(match: MatchDetail, viewer?: string) {
  const scale = Math.max(
    1,
    match.result.time,
    ...match.completions.map((entry) => entry.time),
    ...match.timelines.map((entry) => entry.time),
  );
  const orderedPlayers = [...match.players];
  const primaryIndex =
    match.type === 2
      ? orderedPlayers.findIndex((player) => player.uuid === viewer)
      : -1;
  if (primaryIndex > 0) {
    orderedPlayers.unshift(...orderedPlayers.splice(primaryIndex, 1));
  }
  const players = orderedPlayers.map((player): PlayerTimeline => {
    const completion = match.completions.find(
      (entry) => entry.uuid === player.uuid,
    );
    const recorded = match.timelines
      .filter((entry) => entry.uuid === player.uuid && entry.time >= 0)
      .sort((a, b) => a.time - b.time);
    // A match with no recorded events should not invent stage timings.
    if (recorded.length === 0)
      return {
        player,
        completionTime: completion?.time,
        lastSplitTime: undefined,
        furthestMilestone: undefined,
        furthestMilestoneTime: undefined,
        furthestProgress: -1,
        checkpoints: [],
        splits: [],
      };
    const forfeit = recorded.find(
      (entry) => entry.type === 'projectelo.timeline.forfeit',
    );
    const winner = match.result.uuid === player.uuid;
    const draw = match.result.uuid == null && !match.forfeited;
    const end =
      completion?.time ??
      forfeit?.time ??
      (winner || draw || match.forfeited ? match.result.time : scale);
    const lastSplit = recorded.findLast(
      (entry) => events[entry.type] && entry.time <= end,
    );
    const terminal = completion
      ? 'finish'
      : forfeit
        ? 'forfeit'
        : draw
          ? 'draw'
          : winner
            ? 'win'
            : match.forfeited
              ? 'disconnected'
              : 'loss';
    const checkpoints: Checkpoint[] = [
      { key: 'start', name: 'start', time: 0, color: '#55ee55' },
    ];
    let furthestMilestone = lastSplit ? 'overworld' : undefined;
    let furthestMilestoneTime = lastSplit ? 0 : undefined;
    let furthestProgress = lastSplit ? 0 : -1;
    const occurrences = new Map<string, number>();
    for (const entry of recorded) {
      const event = events[entry.type];
      if (!event || entry.time > end || entry === forfeit) continue;
      if (event.progress != null && event.progress > furthestProgress) {
        furthestProgress = event.progress;
        furthestMilestone = event.name;
        furthestMilestoneTime = entry.time;
      }
      const count = (occurrences.get(entry.type) ?? 0) + 1;
      occurrences.set(entry.type, count);
      checkpoints.push({
        key: `${entry.type}:${count}`,
        name: event.name + (count > 1 ? ` ${count}` : ''),
        time: entry.time,
        color: event.color ?? checkpoints.at(-1)!.color,
      });
    }
    checkpoints.push({
      key: terminal,
      name: terminal,
      time: Math.max(0, end),
      color: winner || completion ? '#22c55e' : draw ? '#3b82f6' : '#ef4444',
    });
    const splits = checkpoints.slice(0, -1).map((point, index) => {
      const next = checkpoints[index + 1];
      const name = `${point.name} → ${next.name}`;
      return {
        key: `${point.key}/${next.key}`,
        name: splitNames[name] ?? name,
        start: point.time,
        end: next.time,
        time: next.time - point.time,
        color: point.color,
      };
    });
    return {
      player,
      completionTime: completion?.time,
      lastSplitTime: lastSplit?.time,
      furthestMilestone,
      furthestMilestoneTime,
      furthestProgress,
      checkpoints,
      splits,
    };
  });
  const bars = [...players].sort((a, b) => {
    const aCompleted = a.completionTime != null;
    const bCompleted = b.completionTime != null;
    if (aCompleted !== bCompleted) {
      return aCompleted ? -1 : 1;
    }
    if (!aCompleted && a.furthestProgress !== b.furthestProgress) {
      return b.furthestProgress - a.furthestProgress;
    }
    const aTime = a.completionTime ?? a.furthestMilestoneTime ?? Infinity;
    const bTime = b.completionTime ?? b.furthestMilestoneTime ?? Infinity;
    if (aTime !== bTime) return aTime - bTime;
    return (
      a.player.nickname.localeCompare(b.player.nickname) ||
      a.player.uuid.localeCompare(b.player.uuid)
    );
  });
  return { scale, players, bars };
}
