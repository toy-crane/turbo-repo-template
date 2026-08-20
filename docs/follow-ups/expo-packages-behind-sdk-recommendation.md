# Expo 패키지가 SDK 권장 버전보다 낮아 bun run check가 실패한다

**Symptom**: 루트에서 `bun run check`를 실행하면 `@repo/mobile#check`가 종료 코드 1로 끝난다. `expo install --check`가 여러 패키지의 설치 버전이 Expo SDK 권장 버전보다 낮다고 알린다.

**Observed evidence**: 2026-08-20 이 저장소에서 확인했다. 같은 날 두 번 실행했는데 목록이 2개에서 7개로 늘었다. 두 번째 실행에서는 `expo@57.0.13`(권장 `~57.0.14`), `expo-build-properties@57.0.11`(`~57.0.12`), `expo-constants@57.0.11`(`~57.0.12`), `expo-dev-client@57.0.12`(`~57.0.13`), `expo-image-picker@57.0.10`(`~57.0.11`), `expo-router@57.0.13`(`~57.0.14`), `expo-splash-screen@57.0.6`(`~57.0.7`)를 알렸다. 검사가 Expo의 원격 호환 목록을 조회하므로 저장소를 바꾸지 않아도 목록이 늘어난다. `apps/mobile/package.json`의 값은 `168eaa7`과 같으므로 기존 상태다. 같은 커밋에서 `bun run check-types`와 `bun run test`(56개 스위트, 392개 모바일 테스트 포함)는 모두 통과한다. 실패하는 것은 `check:expo` 하나뿐이다.

**Suspected cause**: Expo SDK 57의 권장 목록이 패치 버전을 올렸는데 `apps/mobile/package.json`이 따라가지 않은 것으로 보인다. [모바일 Expo 의존성 호환](../decisions/mobile-expo-dependency-compatibility.md)은 이 검사가 버전 차이에서 실패하도록 일부러 넣었다고 밝히므로 검사 자체는 의도대로 동작하는 중이다.

**What was tried**: 아무것도 바꾸지 않았다. 목록에 든 패키지 대부분이 네이티브 의존성이라 결정 계약이 버전을 올린 뒤 iOS와 Android Development Build를 다시 만들어 영향을 받는 흐름을 기기에서 확인하도록 요구한다. 이번 작업은 로컬 인증 제공자 설정만 다뤘고 `apps/` 아래 파일을 하나도 건드리지 않았다.

**Proposed next step**: 먼저 `bun run --cwd apps/mobile expo install --check`로 그 시점의 목록을 다시 뽑는다. 목록이 계속 움직이므로 이 문서의 버전을 그대로 믿지 않는다. 그다음 `expo install`로 권장 버전에 맞추고, 결정 계약이 요구하는 대로 두 플랫폼 Development Build를 다시 만들어 화면 전환, 딥링크, 앱 시작 화면, 사진 선택을 확인한다. 회귀가 나오면 되돌리는 대신 `expo.install.exclude` 예외 근거를 결정 계약에 남긴다.
