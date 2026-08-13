# Worktree 개발 세션

## 결정

- 루트의 `bun run dev <ios|android>`를 저장소 전체 로컬 개발 세션의 기본 실행 명령으로 사용한다. 이 명령은 API, Metro와 대상 Simulator 또는 Emulator를 함께 시작한다.
- 플랫폼 인수는 필수다. `bun run dev`만 실행하면 아무것도 시작하지 않고 사용법을 보여 준다. 한 Git worktree에서는 한 번에 한 플랫폼만 실행한다.
- 기본 저장소 폴더와 추가 Git worktree를 같은 실행 단위로 취급한다. 실행 단위는 브랜치 이름이 아니라 정규화된 worktree 절대 경로로 식별한다.
- worktree마다 고정 slot과 API·Metro 포트를 배정한다. 플랫폼별 기기는 저장소 공용 풀에서 하나씩 독점 배정하고, 일반 종료 뒤에도 이 상태를 유지해 다음 실행에서 재사용한다.
- 네이티브 Development Build는 저장소 단위로 공유한다. 플랫폼과 Expo native fingerprint가 같은 worktree는 공용 빌드 결과를 설치해 재사용한다.
- 앱 데이터와 로그인 상태는 공용 빌드에 포함하지 않는다. 각 worktree에 배정한 Simulator 또는 AVD가 독립적으로 소유한다.
- 로컬 Supabase 스택은 모든 worktree가 공유한다. 개발 세션 명령은 Supabase를 시작하거나 중지하거나 초기화하지 않는다.
- Portless를 기본 개발 경로에 넣지 않는다. slot에서 실제 포트를 계산하고 개발 세션이 직접 소유한다.
- 개발 세션이 정한 모바일 API와 Supabase 주소는 `EXPO_PUBLIC_DEV_SESSION_API_URL`과 `EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL`로 Metro에 전달한다. 앱은 이 값이 있으면 일반 모바일 URL보다 우선한다.
- iOS Simulator에는 `127.0.0.1`을, Android Emulator에는 `10.0.2.2`를 호스트로 전달한다. API는 worktree slot의 포트를 사용하고 Supabase는 공유 로컬 포트 `54321`을 사용한다.
- 실행 중인 세션은 공개 모바일 환경의 fingerprint가 같을 때만 API와 Metro를 재사용한다. 환경이 바뀌면 해당 worktree의 두 프로세스만 다시 시작하고 slot, 기기, 설치된 앱과 앱 데이터는 유지한다.
- 모든 시작 명령은 새 자원을 배정하기 전에 저장소 상태를 실제 Git worktree와 실행 중인 프로세스에 맞춘다. 사라진 worktree의 자원은 회수하고, 살아 있는 worktree의 기기 배정과 앱 데이터는 유지한다.

## 경계

- 이 결정은 로컬 iOS Simulator와 Android Emulator 개발에 적용한다. 실제 기기, Expo Web, 원격 기기와 CI 기기 실행은 포함하지 않는다.
- `apps/mobile`과 `apps/api`의 개별 `dev`, `ios`, `android`, `start` 명령은 수동 진단에 사용할 수 있지만 worktree 간 포트와 기기 격리를 보장하지 않는다.
- `bun run dev:stop`은 실행 프로세스와 기기만 중단한다. slot, 기기, 앱 데이터와 공용 빌드는 유지한다.
- `bun run dev:remove`는 현재 worktree에 배정된 기기를 초기화해 풀로 돌려놓고 slot을 반납한다. Git worktree, 풀의 기기와 저장소 공용 빌드는 삭제하지 않는다.
- Git worktree를 외부에서 먼저 삭제하면 다음 `bun run dev <ios|android>`가 남은 프로세스, slot과 기기 배정을 회수한다. Codex나 Claude Code 전용 삭제 hook과 상시 실행 daemon은 사용하지 않는다.

## 이유

브랜치 이름은 같은 폴더에서 바뀔 수 있고 detached HEAD에는 없으므로 실행 환경의 안정적인 식별자가 아니다. worktree 경로에 고정 slot과 독점 기기 배정을 연결하면 같은 bundle ID를 유지하면서도 여러 checkout을 동시에 실행할 수 있다.

네이티브 빌드는 느리지만 앱 데이터와 로그인 상태는 worktree마다 달라야 한다. 따라서 플랫폼과 native fingerprint가 같은 빌드 결과만 저장소 전체에서 공유하고, 설치 대상 기기는 worktree마다 독점 배정한다. worktree가 사라지면 기기를 초기화해 풀로 돌려놓으므로 이전 로그인 상태는 다음 worktree로 넘어가지 않는다.

도구별 worktree 삭제 시점은 같지 않다. 개발 세션이 실행 전에 Git worktree와 프로세스 상태를 직접 확인하면 Codex, Claude Code와 일반 터미널이 같은 수명 규칙을 사용한다. 삭제 직후의 정리보다 다음 실행 전의 일관된 회수를 택해 hook과 daemon 없이 기기가 삭제한 worktree 수만큼 늘어나는 일을 막는다.

Portless는 고정 hostname과 빈 포트 선택에는 유용하지만 Simulator·Emulator 소유권, Development Build 호환성, 정확한 Metro 연결을 관리하지 않는다. 현재 범위에서는 별도 프록시 계층 없이 하나의 개발 세션이 포트와 기기를 함께 관리하는 편이 단순하다.

Expo SDK 57의 개발 번들은 셸에서 받은 `EXPO_PUBLIC_` 값 뒤에 `.env.local` 값을 다시 합친다. 개발 세션과 일반 설정이 같은 변수 이름을 쓰면 Android용 `10.0.2.2`가 `.env.local`의 `127.0.0.1`로 바뀐다. 개발 세션 전용 이름을 사용하면 `.env.local`을 수정하지 않고도 세션 주소의 소유권을 지킬 수 있다.

## 재검토 조건

- Expo Web이나 브라우저 자동화에 worktree별 고정 hostname이 필요할 때
- OAuth callback, CORS, 쿠키 또는 localStorage를 worktree별 hostname으로 분리해야 할 때
- 같은 worktree에서 iOS와 Android를 동시에 실행해야 할 때
- 실제 기기나 원격 기기를 기본 개발 대상으로 지원할 때
- 공유 Supabase 때문에 서로 다른 스키마 변경을 동시에 검증하지 못하는 일이 반복될 때
- 공용 네이티브 빌드가 쌓여 저장 공간 관리가 필요할 때
- 다음 개발 세션까지 기다리지 않고 Git worktree 삭제 직후 자원을 반드시 회수해야 할 때
- 살아 있는 worktree보다 작은 고정 기기 풀 크기를 강제해야 할 때

## 계속 제외하는 대안

- iOS를 기본 플랫폼으로 사용: 짧지만 실행 대상을 명령에서 확인할 수 없고 Android 작업에서도 실수로 iOS를 열 수 있다.
- 실행 중인 기기나 이전 실행에서 플랫폼 추론: 같은 명령의 결과가 로컬 상태에 따라 달라져 사람과 에이전트가 예측하기 어렵다.
- 브랜치 이름으로 실행 환경 식별: 브랜치 전환과 detached HEAD를 안정적으로 처리하지 못한다.
- Codex와 Claude Code에 서로 다른 삭제 hook 사용: Git worktree를 지우는 도구에 따라 정리 시점과 보장이 달라진다.
- 상시 실행 정리 daemon: 삭제 직후 회수할 수 있지만 별도 프로세스의 설치, 재시작과 장애 처리가 필요하다.
- worktree마다 기기를 만들고 삭제 전에 `dev:remove` 강제: 삭제 명령을 우회하면 기기가 계속 남고 순서대로 만든 worktree 수만큼 늘어날 수 있다.
- worktree마다 같은 native fingerprint를 다시 빌드: 구현은 단순하지만 현재 iOS 소스 빌드 비용을 worktree마다 반복한다.
- 준비된 기준 Simulator 복제: iOS와 Android에 같은 방식으로 적용할 수 없고 기준 기기의 빌드 갱신과 오염을 별도로 관리해야 한다.
- worktree마다 Supabase 실행: DB 포트, Docker 자원, seed와 schema drift 관리가 일상 개발 과정에 추가된다.
- 같은 AVD의 읽기 전용 다중 실행: worktree별 앱 데이터와 로그인 상태를 지속해서 보존하지 못한다.
- 일반 모바일 URL을 개발 세션에서 덮어쓰기: Expo SDK 57 개발 번들이 `.env.local` 값을 다시 우선하므로 최종 앱 주소를 보장하지 못한다.
- 앱에서 `Platform.OS`로 개발 주소 계산: 플랫폼과 slot을 이미 아는 개발 세션의 계산을 앱에 중복하고 일반 개발 빌드와 관리 세션을 구분하지 못한다.

## 보존할 근거

- 현재 API 개발 명령은 `3900`을 사용하고 Metro 기본 포트는 `8081`이다.
- Android Emulator에서 호스트의 loopback 서비스는 `10.0.2.2`로 접근해야 한다. iOS Simulator는 `127.0.0.1`을 사용한다.
- Expo SDK 57의 `expo/virtual/env` 개발 변환은 `.env` 파일 값을 `process.env` 뒤에 합친다. Expo 이슈 `#41981`과 열린 PR `#41999`도 셸 값이 `.env` 값에 덮이는 같은 동작을 다룬다.
- Expo SDK 57의 플랫폼별 native fingerprint는 서로 다르므로 공용 빌드는 플랫폼별로 구분해야 한다.
- 현재 앱에서 `EXPO_PUBLIC_API_URL`만 `http://127.0.0.1:3900`과 `http://127.0.0.1:3910`으로 바꿔 만든 iOS native fingerprint는 모두 `4a36fb8683f551d9b9cf800effec1f673b736511`이었다. slot별 API 포트는 공용 네이티브 빌드 재사용을 막지 않는다.
