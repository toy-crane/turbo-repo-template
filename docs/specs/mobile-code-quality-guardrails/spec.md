# 모바일 코드 품질 안전장치 명세

## 목표

모바일 앱의 잘못된 내부 경로, Expo SDK와 맞지 않는 네이티브 의존성, 짧은 화면 이동에서 생기는 불필요한 원격 데이터 재요청을 일반 검사에서 미리 찾거나 막는다. 화면과 기능 동작은 바꾸지 않는다.

## 적용할 결정

- [모바일 라우팅 타입 안전성](../../decisions/mobile-routing-type-safety.md)
- [모바일 Expo 의존성 호환](../../decisions/mobile-expo-dependency-compatibility.md)
- [모바일 원격 데이터 상태](../../decisions/mobile-remote-data.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 현재 기준

- Expo Router를 사용하지만 `experiments.typedRoutes`가 꺼져 있다.
- 모바일 `check-types`는 경로 타입을 준비하지 않고 `tsc --noEmit`만 실행한다.
- 모바일 `check`와 루트 `bun run check`는 `expo install --check`를 실행하지 않는다.
- 설치한 Expo SDK 57의 권장 목록은 `react-native-keyboard-controller` `1.21.9`를 요구하지만 모바일 앱은 `1.22.3`을 사용한다.
- 공용 `QueryClient`에는 `defaultOptions`가 없다. 따라서 일반 쿼리는 TanStack Query의 `staleTime: 0` 기본값을 사용한다.
- 아이디 중복 확인 쿼리는 이미 `staleTime: 0`을 직접 지정한다.

## 확정한 범위

### Expo Router typed routes

- 모바일 Expo 설정에서 `experiments.typedRoutes`를 켠다.
- `check-types`는 `expo customize tsconfig.json`으로 현재 경로 파일의 타입을 만든 뒤 `tsc --noEmit`을 실행한다.
- 개발 서버를 한 번도 실행하지 않은 깨끗한 checkout에서도 타입 검사 명령 하나로 같은 경로 타입을 준비한다.
- 고정된 내부 경로는 절대 경로를 사용한다. 동적 경로는 `pathname`과 `params`를 나눈 객체를 사용한다.
- 타입 오류를 숨기기 위한 `Href` 강제 변환을 추가하지 않는다.
- `.expo/types/router.d.ts`와 `expo-env.d.ts`는 생성 결과로 유지하며 Git에 올리지 않는다.

### Expo 의존성 호환 검사

- 모바일 `check`에 변경을 적용하지 않는 `CI=1 expo install --check`를 포함한다. 루트 `bun run check`도 같은 검사 실패를 전달한다.
- 호환 검사는 제품 자격 증명이나 로컬 `.env`가 없는 깨끗한 자동 검사에서도 실행된다.
- `react-native-keyboard-controller`를 Expo SDK 57 권장 버전인 `1.21.9`로 먼저 맞춘다.
- 권장 버전의 Android Development Build에서 키보드를 닫은 뒤 입력창이 키보드 높이에 남는 회귀를 확인했다. 기존 `1.22.3`을 복구하고 이 패키지만 `expo.install.exclude`에 등록한다.
- `1.22.3`을 넣어 새로 만든 iOS와 Android Development Build에서 키보드 회피, 목록 드래그와 키보드 닫기를 다시 확인한다.

### TanStack Query 데이터 신선도

- 공용 `QueryClient`의 모든 쿼리에 기본 `staleTime: 60_000`을 적용한다.
- 1분 안에는 명시적으로 무효화하지 않은 같은 쿼리를 다시 불러오지 않는다.
- 아이디 중복 확인처럼 답이 바로 달라질 수 있는 기존 쿼리의 `staleTime: 0`은 유지한다.
- 데이터 변경 뒤 사용하는 `setQueryData()`와 `invalidateQueries()` 흐름은 그대로 유지한다.

## 제외할 범위

- TanStack Query의 전역 `retry`, `retryDelay`, `gcTime` 변경
- `focusManager`, `onlineManager`, 앱 복귀 또는 네트워크 재연결 처리 추가
- 캐시 영속화와 오프라인 우선 동기화
- Expo Code Review 도입과 전용 reviewer의 CI 자동 실행
- 모바일 UI 일관성 검토 에이전트 생성 또는 변경
- 화면 구성, 내비게이션 기록, 키보드 동작과 원격 데이터 화면의 표시 방식 변경
- Expo SDK, React Native 또는 다른 네이티브 패키지의 일괄 업그레이드

## 완료 조건

1. Expo가 해석한 모바일 설정에서 `experiments.typedRoutes`가 `true`다.
2. `.expo`가 없는 상태에서 모바일 `check-types`를 실행하면 경로 타입을 만든 뒤 전체 TypeScript 검사를 통과한다.
3. 임시로 존재하지 않는 내부 경로를 사용하면 같은 `check-types`가 실패한다. 이 검증용 변경은 저장소에 남기지 않는다.
4. 모바일 `check`와 루트 `bun run check`는 Expo 의존성 호환 검사를 실행하며 버전 차이가 있으면 실패한다.
5. 호환 검사는 제품 환경 변수와 로컬 `.env` 없이 실행된다.
6. `react-native-keyboard-controller`는 검증한 `1.22.3`으로 설치되고 이 패키지만 `expo.install.exclude`에 등록된다. `expo install --check`는 나머지 버전 차이 없이 끝난다.
7. 공용 `QueryClient`의 쿼리 기본 `staleTime`은 `60_000`이다. 아이디 중복 확인은 `0`을 유지한다.
8. 자동 테스트는 공용 QueryClient의 1분 기본값과 쿼리별 예외를 확인한다.
9. 저장소의 타입 검사, 정적 검사와 관련 모바일 테스트를 통과한다.
10. iOS와 Android Development Build에서 로그인 입력, 채팅 입력, 키보드 회피, 스크롤과 키보드 닫기가 기존과 같게 동작한다.

## 검증 방법

- 깨끗한 경로 타입 생성 조건과 존재하지 않는 경로의 실패를 확인한다.
- 제품 환경 변수를 제거한 별도 프로세스에서 모바일 Expo 의존성 호환 검사를 확인한다.
- `QueryClient.getDefaultOptions()`와 아이디 중복 확인 쿼리의 옵션을 자동 테스트로 확인한다.
- 저장소 루트의 `bun run check`, `bun run check-types`, `bun run test`를 실행한다.
- 저장소 루트의 `bun run dev ios`와 `bun run dev android`로 Development Build를 열어 키보드 관련 흐름을 확인한다.

## 가정

- 구현하는 동안 Expo SDK `57.0.11`, Expo Router `57.0.11`, TanStack Query `5.101.4`를 유지한다.
- `react-native-keyboard-controller` 외의 패키지 버전은 호환 검사가 찾은 Expo SDK 57 권장 패치 버전만 적용한다.
- 기본 `staleTime` 1분은 Supabase 인증 세션에 적용되지 않는다. 인증 세션은 Query 캐시에 넣지 않는다.

## 남은 위험

- 동적 Expo 설정이 제품 환경 변수를 강제로 읽으므로, 호환 검사에서만 제품 설정과 분리하는 경계를 잘못 잡으면 일반 앱 실행의 환경 검증을 약하게 만들 수 있다.
- `react-native-keyboard-controller`를 권장 버전으로 낮추면 최신 버전에서 해결된 동작이 다시 나타날 수 있다. 자동 검사만으로 판단하지 않고 두 플랫폼의 실제 키보드 흐름을 확인한다.
- 1분 안에 다른 기기나 서버에서 바뀐 데이터는 명시적인 무효화가 없으면 즉시 보이지 않을 수 있다. 현재 확정한 비용이며 실제 사용에서 문제가 확인되면 데이터 역할별 `staleTime`을 다시 정한다.
- Expo가 경로 타입 생성 명령이나 SDK 57 권장 버전을 바꾸면 현재 명령과 버전 기준을 다시 확인해야 한다.

## 구현 결과

- Expo Router의 typed routes를 켰다. 모바일 `check-types`는 제품 환경 변수 없이 경로 타입을 만든 뒤 TypeScript 검사를 실행한다.
- 모바일 `check`에 Expo 의존성 호환 검사를 넣었다. Expo가 새로 권장한 SDK 57 패치 버전을 적용했고, 실제 Android 회귀가 생긴 `react-native-keyboard-controller`만 검증한 `1.22.3`으로 복구해 검사 예외로 기록했다.
- 공용 QueryClient에 `staleTime: 60_000`을 적용했다. 아이디 중복 확인과 아이디 제안 쿼리는 `staleTime: 0`을 유지한다.
- `bun run check`, `bun run check-types`와 `bun run test`를 통과했다. 모바일 테스트 45개 묶음의 테스트 295개가 통과했다.
- 새로 만든 iOS와 Android Development Build에서 실제 이메일 로그인, 온보딩, 채팅 입력과 전송, 목록 드래그, 키보드 닫기와 로그아웃을 확인했다.

## 상태

completed
