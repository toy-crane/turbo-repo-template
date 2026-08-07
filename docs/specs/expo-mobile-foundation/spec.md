# Expo 모바일 기반 스펙

## 목표

모노레포에 Expo SDK 57 모바일 앱을 추가하고, 앱 전용 Development Build를 기본 개발 런타임으로 사용한다. 빠른 단위·컴포넌트 테스트와 실제 앱 런타임 검증을 처음부터 함께 제공하여 Codex와 Claude가 구현 후 결과를 직접 확인할 수 있게 한다.

## 적용할 결정

- [모바일 개발 런타임](../../decisions/mobile-development-runtime.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 필요한 최종 상태

### 워크스페이스와 의존성 소유권

| 위치 | 소유 항목 |
| --- | --- |
| 모노레포 루트 | 정확한 버전의 `agent-device` CLI, 공용 실행 스크립트, Node.js 도구 체인 요구사항 |
| `apps/mobile` | Expo SDK 57 앱, `expo-dev-client`, Jest 및 React Native Testing Library 구성 |
| `.agents/skills` | Expo, `agent-device`, `react-native-testing` 공식 Skill 원본 |
| `.claude/skills` | `.agents/skills`의 같은 Skill을 가리키는 상대 symlink |

- `agent-device`는 루트 `devDependencies`에 `0.20.5`로 정확히 고정한다.
- `agent-device`가 요구하는 Node.js `22.12` 이상을 루트 도구 체인 계약에 반영한다.
- 모바일 테스트 패키지는 `apps/mobile`에서 Expo CLI로 호환 버전을 선택하고 Bun lockfile에 고정한다.
- `agent-device`와 테스트 패키지를 모바일 앱의 운영 의존성에 포함하지 않는다.

### 모바일 개발 런타임

- 모바일 앱은 `apps/mobile` 워크스페이스에 둔다.
- 지원 플랫폼은 iOS와 Android뿐이며 Expo Web용 스크립트, 설정 및 검증 경로를 만들지 않는다.
- `expo-dev-client`가 포함된 앱 전용 Development Build를 로컬에서 컴파일한다.
- JavaScript만 변경되면 설치된 Development Build와 Metro를 재사용한다.
- 네이티브 의존성, 네이티브 설정 또는 Expo SDK가 변경되면 Development Build를 다시 생성한다.
- Expo Router 사용 여부와 최초 제품 내비게이션 구조는 이 스펙에서 결정하지 않는다. Router를 채택하면 그 결정에 맞는 공식 템플릿과 테스트 도구를 사용한다.

### 단위·컴포넌트 테스트

- 모바일 앱의 개발 의존성에는 `jest`, `jest-expo`, `@types/jest`, `@testing-library/react-native`, `test-renderer`가 포함되어야 한다.
- Expo SDK 57의 React 19와 React Native 0.86 조합에는 React Native Testing Library v14를 사용하고, v14가 요구하는 `test-renderer`를 명시적인 피어 의존성으로 설치한다. 사용이 중단된 `react-test-renderer`와 혼동하지 않는다.
- Jest는 `jest-expo` 프리셋과 Bun용 React Native 변환 예외 구성을 사용해야 한다.
- 기본 `test` 명령은 감시 모드 없이 종료되어 루트 Turbo 태스크와 자동화에서 사용할 수 있어야 한다. 대화형 실행은 별도의 감시 스크립트로 제공한다.
- 루트의 `test` 명령은 Turbo를 통해 모바일 워크스페이스 테스트를 실행해야 한다.
- 테스트 파일은 테스트 대상과 가까운 `__tests__` 또는 별도 테스트 디렉터리에 두며, Expo Router를 사용할 경우 라우트 디렉터리 안에 두지 않는다.
- 첫 셋업에는 순수 함수 테스트와 React Native Testing Library 컴포넌트 스모크 테스트를 각각 하나 이상 포함한다.
- 컴포넌트 테스트는 React Native Testing Library v14의 비동기 `render`, `screen`, 접근성 역할·이름 기반 쿼리, `userEvent`를 우선 사용한다. `testID`, `fireEvent`, 스냅샷은 더 적절한 사용자 관점 검증이 없을 때만 사용한다.
- Expo Router를 채택하면 `expo-router/testing-library`로 초기 URL과 최소 내비게이션 흐름을 검증한다.

### 실제 앱 검증

- Codex와 Claude가 전역 설치나 변경 가능한 `npx ...@latest` 없이 루트에 고정된 `agent-device` CLI를 실행할 수 있는 패키지 스크립트를 제공한다.
- 실행 전에 CLI 버전과 `doctor` 결과를 확인하고, 설치된 CLI의 버전별 도움말을 사용한다.
- 최소 검증 흐름은 Development Build 실행, 앱 세션 열기, 접근성 스냅샷 확인, 사용자 동작 한 번 수행, 상태 재확인, 스크린샷 저장, 세션 종료로 구성한다.
- 로그는 기본적으로 계속 수집하지 않는다. 오류 재현이 필요할 때만 범위를 제한한 로그 구간을 열고 결과 아티팩트 경로를 남긴다.
- 접근성 레이블과 역할은 React Native Testing Library 쿼리와 `agent-device` 선택자가 함께 사용할 수 있는 제품 계약으로 취급한다.

## 완료 조건

- 깨끗한 체크아웃에서 지정된 Bun과 Node.js 버전으로 의존성을 설치할 수 있다.
- 루트 검사 명령과 모바일 앱의 비대화형 테스트 명령이 성공하고 종료된다.
- React Native Testing Library 스모크 테스트가 실제 사용자 쿼리를 사용해 통과한다.
- iOS와 Android용 로컬 Development Build 명령이 구성되어 있으며, 현재 개발 환경에서 사용 가능한 플랫폼의 빌드를 실제로 실행해 확인한다.
- 실행 중인 Development Build에 대해 `agent-device`가 앱을 찾고 접근성 스냅샷과 스크린샷을 생성한다.
- `agent-device`와 두 공식 Callstack Skill이 프로젝트에 고정되어 있고 Claude symlink가 유효하다.
- Expo Web, EAS Build·Workflows, TestFlight, 스토어 제출, 원격 기기 호스트, MCP, Plugin 및 Maestro 설정이 생성되지 않는다.

## 가정

- 모바일 앱 워크스페이스 이름은 `apps/mobile`이다.
- Bun `1.3.6`을 모노레포 패키지 관리자로 계속 사용한다.
- Expo SDK 57 기본 의존성인 React 19.2와 React Native 0.86은 React Native Testing Library v14의 요구사항을 만족한다.
- 최초 구현 시점에 `agent-device 0.20.5`가 공식 Skill의 최소 요구 버전 `0.20.0` 이상을 만족한다.
- Android 로컬 도구 체인이 준비되지 않았다면 Android 실제 빌드 검증만 남은 위험으로 보고하되, Android 구성을 제거하지 않는다.

## 이번 구현에서 제외할 범위

- 제품 기능과 화면 설계
- Expo Router 채택 및 내비게이션 정보 구조
- 실기기 페어링, Apple 서명 및 Android 기기 신뢰 설정
- Cloud 에이전트와 로컬 기기 호스트를 잇는 프록시 또는 터널
- EAS 서비스, TestFlight, 앱 스토어 배포 및 제출
- CI에서 실행되는 E2E와 Maestro 구성
- 커버리지 비율 게이트

이 항목들은 영구 금지가 아니라 별도 요구와 근거가 생겼을 때 새 결정으로 다룬다.

## 남은 위험

- Expo SDK 57 또는 React Native Testing Library가 업데이트되면 React·React Native·`test-renderer` 피어 의존성과 비동기 API 계약을 다시 확인해야 한다.
- 로컬 Jest 모킹에서 통과한 네이티브 기능이 Development Build에서 다르게 동작할 수 있으므로 양쪽 검증 계층을 생략할 수 없다.
- Cloud 환경은 저장소 의존성을 설치할 수 있어도 iOS Simulator를 직접 제공하지 않는다. 원격 검증이 필요해지면 별도의 macOS 기기 호스트 결정이 필요하다.

## 공식 근거

- [Expo의 Jest 및 React Native Testing Library 설정](https://docs.expo.dev/develop/unit-testing/)
- [Expo Router 테스트 설정](https://docs.expo.dev/router/reference/testing/)
- [Expo와 agent-device 연동](https://docs.expo.dev/agents/agent-device/)
- [Callstack agent-device Agent 설정](https://oss.callstack.com/agent-device/docs/agent-setup)
- [Callstack React Native Testing Library 공식 Skill](https://github.com/callstack/react-native-testing-library/tree/main/skills/react-native-testing)
