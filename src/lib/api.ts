import { RankedClient } from 'mcsrranked-sdk';

export const ranked = new RankedClient({
  validation: 'warn',
  timeout: 15_000,
  retries: 2,
});
