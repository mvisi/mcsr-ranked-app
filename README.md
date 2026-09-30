# MCSR Ranked mobile

A native, Android-focused companion for MCSR Ranked. Built with Expo SDK 57, Expo Router, TypeScript, and NativeWind 4. Native playoff data is deferred until the SDK supports it.

## Development

Use Node.js 22 LTS or newer.

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

## Project

- `src/app` contains Expo Router screens.
- `src/components` contains native controls styled with NativeWind.
- `src/lib/api.ts` configures `mcsrranked-sdk` **0.2.0** with `validation: 'warn'`.
- `src/lib/query.ts` configures query caching. The SDK handles request timeouts and retries.
- `tailwind.config.js` contains the website palette and Minecraft font names.

Setup follows the [Expo project guide](https://docs.expo.dev/get-started/create-a-project/) and [NativeWind installation guide](https://www.nativewind.dev/docs/getting-started/installation). The project started with `npx create-expo-app@latest . --template default@sdk-57`.

The Minecraft fonts and Ranked logo come from the MCSR Ranked website. Their upstream rights remain with their owners. The Expo template license is retained in `LICENSE`.
