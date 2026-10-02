# MCSR Ranked mobile

An app for [MCSR Ranked](https://mcsrranked.com/). Built with Expo SDK 57, React Native, Expo Router, TypeScript, and NativeWind 4.

Designed to match the website as close as possible.

## Downloading the App

Currently, only Android is explicitly supported. You can find the latest APK in the release page.

With the help of testers and IOS developers, hopefully IOS support is added in the future.

## Run locally

Install the latest versions of Bun and Node. Expo's CLI runs through Node and requires a [version compatible with SDK 57](https://docs.expo.dev/versions/v57.0.0/).

Clone or download this repository, open a terminal in its directory, and install the dependencies:

```sh
bun install --frozen-lockfile
```

To get the app running on your device, you can build it yourself, or use expo servers. Use the development provile to include the dev tools on the build.

## Build an Android APK

The `preview` profile in [eas.json](eas.json) creates an APK that can be installed directly on an Android phone. [EAS Build](https://docs.expo.dev/build/setup/) builds it in the cloud, so a local Android SDK is not required.

Log in to an Expo account with access to the project:

```sh
bunx eas-cli login
```

If you are building a fork, first set `expo.owner` in [app.json](app.json) to your Expo username or organization and remove the existing `expo.extra.eas.projectId`. Run `bunx eas-cli init` to [create or link your own EAS project](https://docs.expo.dev/eas/cli/#eas-init).

Build the APK:

```sh
bunx eas-cli build --platform android --profile preview
```

When the build finishes, open the APK download link on your phone and install it.
