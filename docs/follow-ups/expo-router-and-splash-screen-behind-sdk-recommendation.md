# expo-router와 expo-splash-screen이 SDK 권장 버전보다 낮아 bun run check가 실패한다

**Symptom**: 루트에서 `bun run check`를 실행하면 `@repo/mobile#check`가 종료 코드 1로 끝난다. `expo install --check`가 `expo-router@57.0.13`은 `~57.0.14`를, `expo-splash-screen@57.0.6`은 `~57.0.7`을 기대한다고 알린다.

**Observed evidence**: 2026-08-20 이 저장소에서 확인했다. `apps/mobile/package.json`이 `expo-router: ~57.0.13`과 `expo-splash-screen: ~57.0.6`을 적고 있다. 두 값은 `168eaa7`에도 같으므로 이번 작업과 무관한 기존 상태다. 같은 커밋에서 `bun run check-types`(5개 패키지)와 `bun run test`(56개 스위트, 392개 테스트)는 모두 통과한다. 실패하는 것은 `check:expo` 하나뿐이다.

**Suspected cause**: Expo SDK 57의 권장 목록이 패치 버전을 올렸는데 `apps/mobile/package.json`이 따라가지 않은 것으로 보인다. [모바일 Expo 의존성 호환](../decisions/mobile-expo-dependency-compatibility.md)은 이 검사가 버전 차이에서 실패하도록 일부러 넣었다고 밝히므로, 검사 자체는 의도대로 동작하는 중이다.

**What was tried**: 아무것도 바꾸지 않았다. 두 패키지는 네이티브 의존성이라 결정 계약이 버전을 올린 뒤 iOS와 Android Development Build를 다시 만들어 영향을 받는 흐름을 기기에서 확인하도록 요구한다. 이번 작업은 로컬 인증 제공자 설정만 다뤘고 `apps/` 아래 파일을 하나도 건드리지 않았다.

**Proposed next step**: `bun run --cwd apps/mobile expo install expo-router expo-splash-screen`으로 권장 버전에 맞춘다. 그다음 결정 계약이 요구하는 대로 두 플랫폼 Development Build를 다시 만들고, expo-router가 소유하는 화면 전환과 딥링크, expo-splash-screen이 소유하는 앱 시작 화면을 확인한다. 회귀가 나오면 권장 버전을 되돌리는 대신 `expo.install.exclude` 예외 근거를 결정 계약에 남긴다.
