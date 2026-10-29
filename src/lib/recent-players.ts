import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export type RecentPlayer = { uuid: string; nickname: string };

const LIMIT = 20;
const FILE_NAME = 'recent-players.json';

// Web is only used for testing, so recent players stay in memory there.
const storage =
  Platform.OS === 'web'
    ? { read: () => null, write: () => {} }
    : {
        read: () => {
          const file = new File(Paths.document, FILE_NAME);
          return file.exists ? file.textSync() : null;
        },
        write: (text: string) =>
          new File(Paths.document, FILE_NAME).write(text),
      };

let players: RecentPlayer[] | undefined;
const listeners = new Set<() => void>();

function load() {
  if (players) return players;
  try {
    const parsed: unknown = JSON.parse(storage.read() ?? '[]');
    players = Array.isArray(parsed) ? (parsed as RecentPlayer[]) : [];
  } catch {
    players = [];
  }
  return players;
}

function save(next: RecentPlayer[]) {
  players = next;
  listeners.forEach((listener) => listener());
  try {
    storage.write(JSON.stringify(next));
  } catch {
    // Recent players are a convenience, so a failed write keeps them in memory only.
  }
}

export function addRecentPlayer(player: RecentPlayer) {
  const current = load();
  if (
    current[0]?.uuid === player.uuid &&
    current[0].nickname === player.nickname
  )
    return;
  save(
    [
      { uuid: player.uuid, nickname: player.nickname },
      ...current.filter((recent) => recent.uuid !== player.uuid),
    ].slice(0, LIMIT),
  );
}

export function removeRecentPlayer(uuid: string) {
  save(load().filter((recent) => recent.uuid !== uuid));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRecentPlayers() {
  return useSyncExternalStore(subscribe, load, load);
}
