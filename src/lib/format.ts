export function duration(
  milliseconds: number | null | undefined,
  precise = false,
) {
  if (milliseconds == null || !Number.isFinite(milliseconds)) return '–';
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
  if (elo == null) return { name: 'Unranked', color: '#a1a1aa' };
  if (elo >= 2000) return { name: 'Netherite', color: '#c084fc' };
  if (elo >= 1500) return { name: 'Diamond', color: '#67e8f9' };
  if (elo >= 1200) return { name: 'Emerald', color: '#4ade80' };
  if (elo >= 900) return { name: 'Gold', color: '#facc15' };
  if (elo >= 600) return { name: 'Iron', color: '#e4e4e7' };
  return { name: 'Coal', color: '#a1a1aa' };
}

export function label(value: string) {
  return value.replace(/^(story|nether|end)\//, '').replace(/[_/]/g, ' ');
}

export function percentage(value: number | null, total: number | null) {
  return total ? `${(((value ?? 0) / total) * 100).toFixed(1)}%` : '–';
}
