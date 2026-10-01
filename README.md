# MCSR Ranked mobile

A native, Android-focused companion for MCSR Ranked. Built with Expo SDK 57, Expo Router, TypeScript, and NativeWind 4. Native playoff data is deferred until the SDK supports it.

## Development

Use Bun 1.3.14 or newer and Node.js 22 LTS. Expo runs its CLI through Node.

```sh
bun install --frozen-lockfile
bun start
```

Scan the QR code with a compatible Expo Go app on an Android phone. The phone and computer should share a network. Use `bunx expo start --tunnel` if the local network cannot connect.

`bun run web` provides a browser preview of the same React Native screens. It does not verify Android behavior.

```sh
bun run typecheck
bun run lint
```

No Android SDK, emulator, or adb is needed for those checks. `bun run android` is optional and requires Android tools.

## Implemented

- Elo leaderboards with every country and past seasons.
- Fastest times with season/all-time and unique-player/all-run filters.
- Earned and predicted phase points.
- Player lookup, ranked season and all-time stats, season history, and recent Elo charts.
- Match history with type/order filters and pagination.
- Match details with player results, seed information, advancement timelines, and VOD links.
- Player comparisons with ranked/casual head-to-head scores and shared matches.
- Current and archived weekly races, player filtering, run results, and seed copying.
- Loading, empty, retry, and pull-to-refresh states.

Playoffs has website and broadcast links. Native playoff data is deferred at your request because SDK 0.2.0 has no playoff resources. Weekly race replay playback opens on the website; a native replay viewer is not implemented.

All Ranked API calls use the SDK's typed methods through the client in `src/lib/api.ts`. No API key is needed for these public stats. Current season and race numbers come from the API.

## Android builds

The `preview` profile in `eas.json` builds an installable APK through EAS. This requires an Expo account and signing setup, but no local Android SDK.

```sh
bunx eas-cli login
bunx eas-cli build --platform android --profile preview
```

No cloud build or signing credentials have been created as part of this setup. See [Expo's APK guide](https://docs.expo.dev/build-reference/apk/).

To verify the Android JavaScript bundle locally, without building an APK:

```sh
bunx expo export --platform android
bunx expo-doctor
```

Typecheck, Expo Doctor, live SDK calls, browser checks, and Android bundle export were used during implementation. Android installation and device behavior still need a physical-device check.

## Project

- `src/app` contains Expo Router screens.
- `src/components` contains native controls styled with NativeWind.
- `src/lib/api.ts` configures `mcsrranked-sdk` **0.2.0** with `validation: 'warn'`.
- `src/lib/query.ts` configures query caching. The SDK handles request timeouts and retries.
- `tailwind.config.js` contains the website palette and Minecraft font names.

Setup follows the [Expo project guide](https://docs.expo.dev/get-started/create-a-project/) and [NativeWind installation guide](https://www.nativewind.dev/docs/getting-started/installation). The project started with `npx create-expo-app@latest . --template default@sdk-57`.

The Minecraft fonts and Ranked logo come from the MCSR Ranked website. Their upstream rights remain with their owners. The Expo template license is retained in `LICENSE`.
