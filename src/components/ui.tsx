import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { RankedError } from 'mcsrranked-sdk';
import {
  useState,
  type ComponentProps,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { twMerge } from 'tailwind-merge';

import { flag, rankTier } from '@/lib/format';
import { KeyboardSheet } from '@/components/keyboard-sheet';

export function Txt({ className, ...props }: ComponentProps<typeof Text>) {
  return (
    <Text
      {...props}
      className={twMerge('font-minecraft text-base text-zinc-100', className)}
    />
  );
}

export function Input({
  className,
  ...props
}: ComponentPropsWithRef<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#71717a"
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      className={twMerge(
        'min-h-12 rounded-md border border-ranked-border bg-ranked-inset px-3 font-minecraft text-base text-white',
        className,
      )}
    />
  );
}

export function Button({
  title,
  onPress,
  disabled,
  secondary,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={twMerge(
        'min-h-12 flex-row items-center justify-center gap-2 rounded-md border px-4 py-3 active:opacity-70',
        secondary
          ? 'border-ranked-border bg-ranked-surface'
          : 'border-lime-700 bg-ranked-green',
        disabled && 'opacity-40',
      )}
    >
      {icon && <Ionicons name={icon} size={18} color="#fafafa" />}
      <Txt className="text-sm">{title}</Txt>
    </Pressable>
  );
}

export function IconButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-md border border-ranked-border bg-ranked-surface active:opacity-70"
    >
      <Ionicons name={icon} size={22} color="#fafafa" />
    </Pressable>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={twMerge(
        'rounded-md border border-ranked-border bg-ranked-surface p-4',
        className,
      )}
    >
      {children}
    </View>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Txt
      accessibilityRole="header"
      className="mb-3 font-minecraft-bold text-xs uppercase tracking-widest text-ranked-muted"
    >
      {children}
    </Txt>
  );
}

export function QueryState({
  pending,
  error,
  retry,
  empty,
}: {
  pending?: boolean;
  error?: unknown;
  retry?: () => void;
  empty?: string;
}) {
  if (pending) {
    return (
      <View className="items-center gap-3 py-10">
        <ActivityIndicator color="#a3d65c" />
        <Txt className="text-sm text-ranked-muted">Loading stats…</Txt>
      </View>
    );
  }
  if (error) {
    const message =
      error instanceof RankedError && error.status === 400
        ? 'No stats found. Check the player name or choose another season.'
        : error instanceof RankedError && error.status === 429
          ? 'Too many requests. Wait a moment, then try again.'
          : 'Could not load stats. Check your connection and try again.';
    return (
      <Card className="m-4 gap-4">
        <Txt className="text-sm text-ranked-muted">{message}</Txt>
        {retry && <Button title="Try again" onPress={retry} secondary />}
      </Card>
    );
  }
  if (empty)
    return (
      <View className="px-4 py-10">
        <Txt className="text-center text-sm text-ranked-muted">{empty}</Txt>
      </View>
    );
  return null;
}

export function RefreshWarning({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  if (!error) return null;
  return (
    <View className="flex-row items-center gap-3 rounded-md border border-ranked-border bg-ranked-surface pl-3">
      <Txt className="flex-1 text-xs text-ranked-muted">
        Could not refresh. Showing saved stats.
      </Txt>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        className="min-h-11 justify-center px-3 active:opacity-70"
      >
        <Txt className="text-xs text-lime-300">Retry</Txt>
      </Pressable>
    </View>
  );
}

export type Option = { label: string; value: string };

export function Select({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const chosen = options.find((option) => option.value === value);
  const close = () => {
    Keyboard.dismiss();
    setOpen(false);
    setFilter('');
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${chosen?.label ?? value}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        className="min-h-12 flex-row items-center justify-between gap-3 rounded-md border border-ranked-border bg-ranked-surface px-3 py-2 active:bg-zinc-700"
      >
        <Txt className="shrink text-sm">{chosen?.label ?? value}</Txt>
        <Ionicons name="chevron-down" size={16} color="#a1a1aa" />
      </Pressable>
      {open && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={close}
        >
          <KeyboardSheet>
            <Pressable
              accessibilityLabel="Close selector"
              accessibilityRole="button"
              onPress={close}
              className="flex-1"
            />
            <SafeAreaView
              edges={['bottom', 'left', 'right']}
              className="max-h-[80%] rounded-t-xl border border-ranked-border bg-ranked-background p-4"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Txt accessibilityRole="header" className="text-xl">
                  {title}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close selector"
                  onPress={close}
                  className="h-12 w-12 items-center justify-center"
                >
                  <Ionicons name="close" size={24} color="#fafafa" />
                </Pressable>
              </View>
              {options.length > 12 && (
                <Input
                  accessibilityLabel={`Filter ${title.toLowerCase()}`}
                  placeholder="Filter options"
                  value={filter}
                  onChangeText={setFilter}
                  className="mb-3"
                />
              )}
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={options.filter((option) =>
                  `${option.label} ${option.value}`
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )}
                keyExtractor={(option) => option.value}
                ListEmptyComponent={<QueryState empty="No matching options." />}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: item.value === value }}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    className="min-h-12 flex-row items-center justify-between border-b border-zinc-800 px-2 py-3 active:bg-ranked-surface"
                  >
                    <Txt
                      className={item.value === value ? 'text-lime-300' : ''}
                    >
                      {item.label}
                    </Txt>
                    {item.value === value && (
                      <Ionicons name="checkmark" color="#a3d65c" size={20} />
                    )}
                  </Pressable>
                )}
              />
            </SafeAreaView>
          </KeyboardSheet>
        </Modal>
      )}
    </>
  );
}

export function Segments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-md border border-ranked-border bg-ranked-inset p-1">
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          className={twMerge(
            'min-h-11 flex-1 items-center justify-center rounded px-2 py-3',
            value === option.value && 'bg-ranked-surface',
          )}
        >
          <Txt
            className={twMerge(
              'text-center text-xs text-ranked-muted',
              value === option.value && 'text-white',
            )}
          >
            {option.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ uuid, size = 32 }: { uuid: string; size?: number }) {
  // Share one resolution across display sizes, with a new cache entry each UTC day.
  const uri = `https://vzge.me/face/128/${encodeURIComponent(uuid)}.png`;
  const day = new Date().toISOString().slice(0, 10);

  return (
    <Image
      accessibilityLabel="Player skin"
      source={{
        uri,
        cacheKey: `${uri}:${day}`,
        headers: { 'User-Agent': 'MCSRRankedMobile/0.1.0' },
      }}
      cachePolicy="memory-disk"
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        backgroundColor: '#3f3f46',
      }}
    />
  );
}

export function PlayerRow({
  player,
  position,
  value,
  detail,
  onPress,
}: {
  player: {
    uuid: string;
    nickname: string;
    country?: string | null;
    eloRate?: number | null;
  };
  position: number;
  value: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rank ${position}, ${player.nickname}, ${value}`}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 border-b border-zinc-800 px-4 py-3 active:bg-ranked-surface"
    >
      <Txt
        numberOfLines={1}
        adjustsFontSizeToFit
        className={twMerge(
          'w-8 shrink-0 text-right text-sm text-zinc-500',
          position === 1 && 'text-yellow-300',
          position === 2 && 'text-zinc-200',
          position === 3 && 'text-orange-300',
        )}
      >
        {position}
      </Txt>
      <Avatar uuid={player.uuid} />
      <View className="flex-1">
        <Txt numberOfLines={1} className="text-sm">
          {player.nickname}
        </Txt>
        <Txt className="mt-1 text-xs text-zinc-500">
          {flag(player.country)}{' '}
          {detail ?? player.country?.toUpperCase() ?? 'World'}
        </Txt>
      </View>
      <Txt
        className="text-sm"
        style={{ color: rankTier(player.eloRate).color }}
      >
        {value}
      </Txt>
      <Ionicons name="chevron-forward" size={14} color="#71717a" />
    </Pressable>
  );
}

export function Stat({
  value,
  title,
}: {
  value: string | number;
  title: string;
}) {
  return (
    <View className="min-w-[45%] flex-1 gap-2">
      <Txt className="text-xl">{value}</Txt>
      <Txt className="text-xs text-ranked-muted">{title}</Txt>
    </View>
  );
}

export function ExternalButton({
  title,
  url,
  icon,
}: {
  title: string;
  url: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View className="gap-2">
      <Button
        title={title}
        icon={icon ?? 'open-outline'}
        secondary
        onPress={() => {
          setFailed(false);
          void Linking.openURL(url).catch(() => setFailed(true));
        }}
      />
      {failed && (
        <Txt className="text-xs text-red-300">
          Could not open the link. Try again.
        </Txt>
      )}
    </View>
  );
}
