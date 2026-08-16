# 모바일 테스트와 런타임 검증

## 결정

- 모바일 앱의 단위·컴포넌트 테스트는 Jest, `jest-expo`, `@types/jest`, React Native Testing Library를 사용한다.
- Expo Router를 채택한 경우 라우팅 통합 테스트에는 `expo-router/testing-library`를 사용한다.
- 컴포넌트 테스트는 접근성 역할과 사용자 동작을 기준으로 작성하며, UI 스냅샷 테스트를 기본 전략으로 사용하지 않는다.
- 실제 앱 검증에는 모노레포 루트에 정확한 버전으로 고정한 `agent-device` CLI와 공식 Skill을 사용한다.
- Codex와 Claude는 프로젝트에 설치된 Skill과 터미널 CLI를 사용한다. `agent-device` MCP와 Plugin은 기본 구성에 포함하지 않는다.
- 초기 E2E 구성에는 Maestro를 추가하지 않는다. 먼저 `agent-device`로 Development Build를 탐색·검증하고, 반복 가치가 확인된 흐름만 재현 가능한 테스트로 고정한다.

## 경계

- Jest와 React Native Testing Library 관련 패키지는 모바일 앱 워크스페이스의 개발 의존성이다. `agent-device`는 앱에 번들되지 않는 저장소 공용 개발 의존성이다.
- Skill은 에이전트에게 사용 절차를 제공할 뿐이므로 `agent-device` CLI를 대체하지 않는다.
- Jest 계층은 Expo 네이티브 API를 모킹하여 빠르게 실행한다. 네이티브 모듈, 운영체제 상호작용, 실제 렌더링 및 런타임 진단은 Development Build와 `agent-device`로 검증한다.
- 현재 범위는 iOS와 Android의 로컬 Simulator·Emulator 검증이다. 원격 기기 호스트, 기기 팜, CI E2E, EAS Workflows 및 실기기 자동화는 별도 결정이 필요하다.
- Expo Web 테스트는 모바일 제품 범위에 포함하지 않는다.

## 이유

`jest-expo`와 React Native Testing Library는 Expo가 안내하는 표준 단위·컴포넌트 테스트 조합이며, 기기 없이 빠른 피드백을 제공한다. `agent-device`는 같은 테스트로 확인할 수 없는 실제 앱 동작과 로그·스크린샷·성능 증거를 Development Build에서 수집한다. 두 계층을 분리하면 빠른 테스트와 네이티브 신뢰성을 함께 확보하면서 초기부터 별도의 E2E 프레임워크와 에이전트 연동 계층을 중복 운영하지 않아도 된다.

## 재검토 조건

- 반복되는 핵심 사용자 흐름을 풀 리퀘스트나 CI에서 결정적으로 실행할 필요가 생길 때
- 터미널 CLI만으로는 에이전트의 `agent-device` 사용을 안정적으로 제공할 수 없을 때
- Cloud 에이전트가 로컬 또는 관리형 기기를 직접 검증해야 할 때
- 여러 모바일 앱이 서로 다른 `agent-device` 버전을 요구할 때
- Expo 또는 React Native의 공식 테스트 권장안이 변경될 때

## 계속 제외하는 대안

- Skill만 설치하고 CLI는 설치하지 않음: Skill은 실행 엔진이 아니므로 기기를 조작할 수 없다.
- MCP 또는 Plugin을 기본 연동으로 사용: 현재 Codex와 Claude는 프로젝트 터미널에서 동일한 CLI를 사용할 수 있어 추가 구성의 이점이 작다.
- UI 스냅샷 테스트 중심 구성: 사용자 관점의 동작과 실제 네이티브 렌더링을 충분히 검증하지 못한다.
- `react-test-renderer`를 직접 사용하는 구성: React 19 이상에서 권장되지 않으며 React Native Testing Library가 대체한다.

## 보존할 근거

- `agent-device 0.20.5`의 `fill`과 `type`은 글자를 넣은 뒤 그 입력칸을 다시 읽는다. 값이 기대와 다르면 칸을 비우고 같은 글자를 다시 친다. CLI가 `fill`에 `textEntryMode: "replace"`를, `type`에 `"append"`를 넘기고(`dist/src/interactor.js`), 다시 치는 코드는 iOS 러너의 `RunnerTests+TextEntry.swift`에 있는 `verifyTextEntryWithRepairIfNeeded`다. 이 확인을 끄는 옵션은 없다.
- 마지막 글자가 화면을 넘기는 입력에서는 다시 읽을 입력칸이 이미 다음 화면의 것이다. 다음 화면에 글자를 받을 입력칸이 있으면 러너가 그 칸을 비우고 방금 친 글자를 다시 친다. 앱은 이 값을 사람이 친 것과 똑같이 받으므로 다음 화면의 상태에 그대로 저장된다.
- 인증 코드 여섯 자리를 `fill`로 넣는 로그인 검증이 이 경우다. 여섯 번째 자리가 코드 확인과 화면 전환을 시작하고, 러너는 닉네임 칸을 비운 뒤 코드를 다시 친다. iOS와 Android 모두에서 같은 결과가 나온다.
- iOS는 러너 로그에 `AGENT_DEVICE_RUNNER_REPAIR_TEXT_ENTRY expectedLength=6 observedLength=3`을 남긴다. `observedLength=3`은 닉네임 칸의 placeholder `닉네임`이다. 로그 경로는 `agent-device logs path`가 알려 주는 세션 폴더의 `runner.log`다.
- 시뮬레이터 키패드를 직접 눌러 넣거나 `adb shell input text`로 넣으면 다음 화면의 입력칸은 비어 있다. 앱이 화면 사이로 값을 옮기는 것이 아니다. 화면을 넘기는 입력에서 다음 화면에 값이 남아 있으면 앱보다 이 동작을 먼저 의심한다.
