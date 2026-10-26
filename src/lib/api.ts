import { RankedClient } from 'mcsrranked-sdk';
import { Platform } from 'react-native';

// The API sends `Cache-Control: max-age=14400`, so the native HTTP cache would
// serve responses up to 4 hours old, even on pull-to-refresh. React Query owns
// freshness, so every request revalidates with the server instead.
const fetchFresh: typeof fetch = (input, init) => {
  // A request header would force a CORS preflight on web.
  if (Platform.OS === 'web')
    return fetch(input, { ...init, cache: 'no-cache' });
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-cache');
  return fetch(input, { ...init, headers });
};

export const ranked = new RankedClient({
  fetch: fetchFresh,
  validation: 'warn',
  timeout: 15_000,
  retries: 2,
});
