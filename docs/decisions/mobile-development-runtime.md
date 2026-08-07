# Mobile development runtime

## Decisions

- Start the mobile app on Expo SDK 57.
- Include `expo-dev-client` and use an app-specific Development Build as the default native development runtime.
- Prefer locally compiled Development Builds for day-to-day iOS and Android development. Expo Go is not a supported primary workflow.

## Boundaries

- JavaScript-only changes reuse an installed Development Build; changes to native dependencies, native configuration, or the Expo SDK require a rebuilt binary.
- Web development does not run through `expo-dev-client`.
- This decision does not configure or authorize EAS Build, TestFlight distribution, signing credentials, paid Expo services, or store submission.

## Why

A Development Build matches the app's native dependency set, supports production-oriented native capabilities, and exposes the Hermes and native debugging paths needed for higher-fidelity diagnosis. Expo Go is optimized for learning and quick experiments and would constrain SDK selection and native integrations. Local compilation keeps the default loop independent of cloud accounts and paid build minutes while the current development machine can build iOS locally.

## Reconsider when

- Expo replaces Development Builds with a more capable recommended runtime.
- The mobile app no longer needs native platforms or native dependencies.
- The team needs signed builds shared with physical devices that cannot be served by the local build workflow.
- A future Expo SDK upgrade changes the development-client or local-build contract.

## Still-rejected alternatives

- Expo Go as the primary runtime — it does not represent the app-specific native runtime and limits native integrations; reconsider only for isolated learning or throwaway experiments.
- EAS Build as the only development-build path — it adds account, signing, network, and possible billing dependencies to the default loop; reconsider when remote distribution becomes a regular team requirement.
