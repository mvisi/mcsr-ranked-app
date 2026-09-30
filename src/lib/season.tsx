import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { Select } from '@/components/ui';
import { ranked } from '@/lib/api';

type SeasonContextValue = {
  selected: number | undefined;
  setSelected: (season: number | undefined) => void;
};

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<number>();
  return (
    <SeasonContext.Provider value={{ selected, setSelected }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (!context) throw new Error('SeasonProvider is required');
  const current = useQuery({
    queryKey: ['leaderboard', 'current'],
    queryFn: () => ranked.leaderboards.elo(),
  });
  return {
    ...context,
    current,
    season: context.selected ?? current.data?.season.number,
  };
}

export function SeasonSelect() {
  const { selected, setSelected, current } = useSeason();
  const number = current.data?.season.number;
  return (
    <Select
      title="Season"
      value={selected == null ? 'current' : String(selected)}
      onChange={(value) =>
        setSelected(value === 'current' ? undefined : Number(value))
      }
      options={[
        {
          label:
            number == null ? 'Current season' : `Season ${number} · Current`,
          value: 'current',
        },
        ...Array.from({ length: number ?? 0 }, (_, index) => ({
          label: `Season ${number! - index - 1}`,
          value: String(number! - index - 1),
        })),
      ]}
    />
  );
}
