export function duration(
  milliseconds: number | null | undefined,
  precise = false,
) {
  if (
    milliseconds == null ||
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  )
    return '–';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const fraction = String(Math.floor((milliseconds % 1000) / 10)).padStart(
    2,
    '0',
  );
  return `${minutes}:${seconds}${precise ? `.${fraction}` : ''}`;
}

export function dateTime(seconds: number | null | undefined) {
  if (seconds == null) return 'Not scheduled';
  return new Date(seconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function flag(country: string | null | undefined) {
  if (!country || !/^[a-z]{2}$/i.test(country)) return '🌐';
  return String.fromCodePoint(
    ...country
      .toUpperCase()
      .split('')
      .map((letter) => 127397 + letter.charCodeAt(0)),
  );
}

export function rankTier(elo: number | null | undefined) {
  if (elo == null) return { name: 'Unrated', color: '#a1a1aa' };
  const ranks = [
    { name: 'Coal', tiers: [0, 400, 500], color: '#aaaaaa' },
    { name: 'Iron', tiers: [600, 700, 800], color: '#ffffff' },
    { name: 'Gold', tiers: [900, 1000, 1100], color: '#eab308' },
    { name: 'Emerald', tiers: [1200, 1300, 1400], color: '#21a83b' },
    { name: 'Diamond', tiers: [1500, 1650, 1800], color: '#2ce0d8' },
    { name: 'Netherite', tiers: [2000], color: '#d066ff' },
  ];
  const rank = ranks.findLast((rank) => Math.max(0, elo) >= rank.tiers[0])!;
  const tier = rank.tiers.findLastIndex((minimum) => elo >= minimum) + 1;
  return {
    name:
      rank.tiers.length === 1
        ? rank.name
        : `${rank.name} ${'I'.repeat(Math.max(1, tier))}`,
    color: rank.color,
  };
}

export function label(value: string) {
  return value.replace(/^(story|nether|end)\//, '').replace(/[_/]/g, ' ');
}

export function percentage(value: number | null, total: number | null) {
  return total && value != null
    ? `${((value / total) * 100).toFixed(1)}%`
    : '–';
}
