# Worktree 개발 세션

## 결정

- 루트의 `bun run dev <ios|android>`를 저장소 전체 로컬 개발 세션의 기본 실행 명령으로 사용한다. 이 명령은 API, Metro와 대상 Simulator 또는 Emulator를 함께 시작한다.
- 플랫폼 인수는 필수다. `bun run dev`만 실행하면 아무것도 시작하지 않고 사용법을 보여 준다. 플랫폼은 여러 개를 나열할 수 있고(`bun run dev ios android`) 적은 순서가 시작 순서다. 기기 부팅과 fingerprint 계산은 모든 플랫폼이 함께 진행하고, 빌드와 앱 열기는 적은 순서대로 한다.
- 한 Git worktree에서 iOS와 Android를 함께 실행한다. 플랫폼 시작 명령은 누적된다. 이미 실행 중인 플랫폼은 다른 플랫폼을 시작해도 내려가지 않는다.
- 여러 플랫폼을 적은 명령은 한 플랫폼이 실패해도 나머지를 계속 시작한다. 결과를 플랫폼별로 보고하고 실패가 하나라도 있으면 명령은 실패로 끝난다. 아무것도 실행 중이지 않으면 요청한 모든 플랫폼의 네이티브 준비를 마친 뒤에 API와 Metro를 띄운다.
- `bun run dev:status`는 모든 worktree의 slot, 포트, 프로세스 생존, 붙은 플랫폼과 기기 배정(iOS 이름과 UDID, Android AVD 이름과 실행 중 serial), 풀의 대기 기기를 보여 준다.
- 배정된 기기는 이름에 slot을 표시한다. iOS Simulator는 배정하는 동안 `<slug>-slot-<번호>`라는 이름을 쓰고 풀로 돌아갈 때 풀 이름(`<slug>-dev-<번호>`)으로 되돌린다. Android는 AVD 이름을 바꿀 수 없으므로 에뮬레이터가 꺼져 있을 때 표시 이름에 같은 표시를 쓰고 반납할 때 지운다. 기기 식별자, 설치된 앱과 앱 데이터는 바뀌지 않는다.
- worktree 하나는 slot 하나만 쓴다. Metro 프로세스 하나가 두 플랫폼의 번들을 함께 내보내고 API 프로세스도 하나만 둔다.
- 기본 저장소 폴더와 추가 Git worktree를 같은 실행 단위로 취급한다. 실행 단위는 브랜치 이름이 아니라 정규화된 worktree 절대 경로로 식별한다.
- worktree마다 고정 slot과 API·Metro 포트를 배정한다. 플랫폼별 기기는 저장소 공용 풀에서 하나씩 독점 배정하고, 일반 종료 뒤에도 이 상태를 유지해 다음 실행에서 재사용한다.
- 네이티브 Development Build는 저장소 단위로 공유한다. 플랫폼과 Expo native fingerprint가 같은 worktree는 공용 빌드 결과를 설치해 재사용한다.
- Android Development Build를 새로 만들 때는 worktree별 `GRADLE_USER_HOME`을 사용한다. Gradle wrapper, 의존성과 빌드 캐시가 다른 worktree의 절대 경로를 다시 쓰지 않는다. persistent Gradle daemon은 사용하지 않아 빌드가 끝난 뒤 해당 홈을 쓰는 JVM을 남기지 않는다.
- 앱 데이터와 로그인 상태는 공용 빌드에 포함하지 않는다. 각 worktree에 배정한 Simulator 또는 AVD가 독립적으로 소유한다.
- 로컬 Supabase 스택은 모든 worktree가 공유한다. 개발 세션 명령은 Supabase를 시작하거나 중지하거나 초기화하지 않는다.
- Portless를 기본 개발 경로에 넣지 않는다. slot에서 실제 포트를 계산하고 개발 세션이 직접 소유한다.
- 개발 세션이 정한 모바일 API와 Supabase 포트는 `EXPO_PUBLIC_DEV_SESSION_API_PORT`와 `EXPO_PUBLIC_DEV_SESSION_SUPABASE_PORT`로 Metro에 전달한다. 앱은 이 값이 있으면 일반 모바일 URL보다 우선한다. 세션은 포트만 정하고 호스트는 앱이 정한다.
- 앱은 `process.env.EXPO_OS`로 자기 번들의 플랫폼을 보고 호스트를 정한다. Android는 `10.0.2.2`, 나머지는 `127.0.0.1`이다. API는 worktree slot의 포트를 사용하고 Supabase는 공유 로컬 포트 `54321`을 사용한다.
- Android Emulator에는 Metro 포트만 `adb reverse`로 넘긴다. 개발 클라이언트 딥링크가 `127.0.0.1`을 담기 때문이다.
- 실행 중인 세션은 공개 모바일 환경과 Metro 입력의 fingerprint가 모두 같을 때만 API와 Metro를 재사용한다. 하나라도 바뀌면 해당 worktree의 두 프로세스만 다시 시작하고 slot, 기기, 설치된 앱과 앱 데이터는 유지한다. 재사용 판단은 플랫폼과 무관하다.
- API와 Metro를 다시 시작하면 그 worktree에 붙어 있던 모든 플랫폼의 앱을 다시 연결한다. 명령에 적지 않은 플랫폼도 함께 다시 연다.
- Metro 자식 프로세스에만 worktree별 `TMPDIR`를 전달한다. 이 경로 아래의 변환 캐시와 파일 목록 캐시는 다른 worktree와 섞이지 않는다. API와 네이티브 빌드는 이 경로를 사용하지 않는다.
- 개발 세션을 시작할 때 `bun.lock`, 루트와 모바일 `package.json`, Expo·Metro·Babel·앱·TypeScript 설정, Expo 앱 설정이 가져오는 파일, Metro patch와 설치된 주요 모바일 패키지 정보를 묶어 Metro 입력 fingerprint를 계산한다. 이전 시작과 다르면 해당 worktree의 Metro에만 `expo start --clear`를 적용한다.
- Metro가 `/status`에서 준비됐다고 응답하면 현재 입력 fingerprint를 기록한다. 이 값은 해당 입력으로 캐시 초기화를 적용한 Metro가 준비됐다는 뜻이며 앱의 bundle 성공 여부를 뜻하지 않는다.
- `bun run dev <ios|android> --clear`는 입력 fingerprint와 관계없이 해당 worktree의 Metro 캐시를 한 번 초기화한다. `dev:stop`은 Metro와 Gradle 캐시를 남기고 `dev:remove`와 사라진 worktree 회수는 두 캐시를 함께 지운다.
- 모든 시작 명령은 새 자원을 배정하기 전에 저장소 상태를 실제 Git worktree와 실행 중인 프로세스에 맞춘다. 사라진 worktree의 자원은 회수하고, 살아 있는 worktree의 기기 배정과 앱 데이터는 유지한다.

## 경계

- 이 결정은 로컬 iOS Simulator와 Android Emulator 개발에 적용한다. 실제 기기, Expo Web, 원격 기기와 CI 기기 실행은 포함하지 않는다.
- worktree 격리는 한 저장소 clone 안에서만 보장한다. 같은 컴퓨터에서 같은 slug를 쓰는 clone을 둘 이상 실행하면 상태 파일은 따로지만 기기 이름은 모두 `<slug>-slot-<번호>` 형식이라 같은 slot끼리 충돌할 수 있다.
- `apps/mobile`과 `apps/api`의 개별 `dev`, `ios`, `android`, `start` 명령은 수동 진단에 사용할 수 있지만 worktree 간 포트와 기기 격리를 보장하지 않는다.
- `bun run dev:status`는 아무것도 바꾸지 않는다. 죽은 프로세스와 사라진 기기는 표시만 하고, 회수는 다음 시작 명령의 몫이다.
- `bun run dev:stop`은 실행 프로세스와 이 worktree에 배정된 두 플랫폼의 기기를 함께 중단한다. slot, 기기, 앱 데이터와 공용 빌드는 유지한다.
- `bun run dev:remove`는 현재 worktree에 배정된 두 플랫폼의 기기를 초기화해 풀로 돌려놓고 slot을 반납한다. Git worktree, 풀의 기기와 저장소 공용 빌드는 삭제하지 않는다.
- Git worktree를 외부에서 먼저 삭제하면 다음 `bun run dev <ios|android>`가 남은 프로세스, slot과 기기 배정을 회수한다. Codex나 Claude Code 전용 삭제 hook과 상시 실행 daemon은 사용하지 않는다.
- Metro 입력 변경은 다음 `bun run dev <ios|android>`에서 확인한다. 실행 중인 세션이 `bun.lock`이나 설정 파일을 계속 지켜보다가 스스로 다시 시작하지는 않는다.
- 자동 초기화는 Metro 캐시에만 적용한다. 네이티브 모듈, config plugin, Expo SDK 또는 React Native 변경으로 Development Build가 달라지는지는 별도의 native fingerprint가 판단한다.
- worktree별 Gradle 홈은 Android native fingerprint를 바꾸지 않는다. 완성한 Android APK는 기존처럼 플랫폼과 native fingerprint를 기준으로 저장소 전체에서 공유한다.
- `watchman watch-del-all`, `node_modules` 삭제와 패키지 재설치는 자동으로 실행하지 않는다. 캐시 초기화로 해결되지 않을 때 사람이 원인을 확인한 뒤 사용하는 진단 절차로 남긴다.

## 이유

브랜치 이름은 같은 폴더에서 바뀔 수 있고 detached HEAD에는 없으므로 실행 환경의 안정적인 식별자가 아니다. worktree 경로에 고정 slot과 독점 기기 배정을 연결하면 같은 bundle ID를 유지하면서도 여러 checkout을 동시에 실행할 수 있다.

네이티브 빌드는 느리지만 앱 데이터와 로그인 상태는 worktree마다 달라야 한다. 따라서 플랫폼과 native fingerprint가 같은 빌드 결과만 저장소 전체에서 공유하고, 설치 대상 기기는 worktree마다 독점 배정한다. worktree가 사라지면 기기를 초기화해 풀로 돌려놓으므로 이전 로그인 상태는 다음 worktree로 넘어가지 않는다.

Gradle의 기본 사용자 홈은 모든 checkout이 함께 쓴다. Gradle 빌드 캐시에는 입력 checkout의 절대 경로가 남을 수 있어서, 삭제한 worktree에서 만든 manifest 결과를 다른 worktree가 다시 쓰면 Android 패키징이 실패한다. Android 빌드 과정만 worktree별 Gradle 홈으로 나누면 경로가 섞이지 않고, 완성한 APK를 공유하는 기존 최적화도 유지한다. Gradle daemon의 기본 유휴 종료 시간은 3시간이므로 폴더만 지우면 JVM이 남는다. `GRADLE_OPTS`에 `-Dorg.gradle.daemon=false`를 더해 빌드마다 종료되는 프로세스만 사용한다.

도구별 worktree 삭제 시점은 같지 않다. 개발 세션이 실행 전에 Git worktree와 프로세스 상태를 직접 확인하면 Codex, Claude Code와 일반 터미널이 같은 수명 규칙을 사용한다. 삭제 직후의 정리보다 다음 실행 전의 일관된 회수를 택해 hook과 daemon 없이 기기가 삭제한 worktree 수만큼 늘어나는 일을 막는다.

Portless는 고정 hostname과 빈 포트 선택에는 유용하지만 Simulator·Emulator 소유권, Development Build 호환성, 정확한 Metro 연결을 관리하지 않는다. 현재 범위에서는 별도 프록시 계층 없이 하나의 개발 세션이 포트와 기기를 함께 관리하는 편이 단순하다.

`EXPO_PUBLIC_` 값은 Metro 프로세스의 환경에서 읽어 번들에 박힌다. 완성된 주소를 넘기면 호스트가 플랫폼마다 달라 Metro 하나가 한 플랫폼의 주소만 담을 수 있고, 그래서 worktree 하나가 한 번에 한 플랫폼만 실행할 수 있었다. 포트만 넘기면 값이 플랫폼과 무관해져 Metro 하나가 두 플랫폼의 번들을 함께 내보낸다.

호스트는 앱이 정한다. `babel-preset-expo`가 `process.env.EXPO_OS`를 번들의 플랫폼 이름으로 치환하므로, 같은 Metro가 만든 iOS 번들과 Android 번들이 서로 다른 호스트를 담는다. `react-native`를 import하지 않으므로 이 판단이 `apps/mobile/env.ts` 안에 남고, 같은 파일을 쓰는 개발 세션 스크립트도 그대로 검증에 사용한다.

빈 명령으로 기기를 켜는 주요 모바일 CLI는 없다. Expo `expo start`는 서버만 띄우고 키 입력을 기다리고, Flutter는 기기 선택지를 보여 주며, Capacitor는 플랫폼이 필수 인수다. 기기 부팅과 네이티브 빌드가 비싸므로 이 계열은 명시를 강제한다. 여러 대상을 위치 인수로 나열하는 형태는 `docker compose up [SERVICE...]`, GNU Make의 다중 goal, `gradle clean build`와 같은 가장 넓은 선례를 따른다.

기기 이름이 slot과 달라서 다른 worktree의 시뮬레이터를 한참 조작한 실제 사고가 slot 표시의 근거다. 같은 slot 이름을 가진 기기가 둘이면 이름으로 기기를 고르는 도구가 모호해지므로, 배정 이름을 주기 전에 그 이름을 가진 다른 기기를 먼저 풀 이름으로 비운다. 다른 worktree가 빌리고 있는 기기는 건드리지 않고 이번 이름 변경을 미룬다. 이름은 표시일 뿐이므로 이름 변경이 실패해도 기기 부팅과 세션 시작을 막지 않는다.

`adb reverse`로 API와 Supabase 포트까지 넘기면 두 플랫폼이 같은 주소를 쓰게 만들 수도 있다. 그렇게 하지 않는 이유는 유지보수다. `10.0.2.2`는 Android 개발자가 바로 아는 상수이고 잘못되면 주소에 그대로 보이지만, 넘기지 못한 `adb reverse`는 주소가 멀쩡해 보이는 채로 실패해서 `adb reverse --list`를 아는 사람만 진단할 수 있다.

Expo SDK 57의 개발 번들은 셸에서 받은 `EXPO_PUBLIC_` 값 뒤에 `.env.local` 값을 다시 합친다. 개발 세션과 일반 설정이 같은 변수 이름을 쓰면 세션이 정한 값이 `.env.local` 값으로 바뀐다. 개발 세션 전용 이름을 사용하면 `.env.local`을 수정하지 않고도 세션 값의 소유권을 지킬 수 있다.

Metro의 기본 변환 캐시는 OS 임시 폴더에 있어 여러 프로젝트와 worktree가 함께 쓴다. Expo는 올바른 캐시 키를 만들어 이 결과를 안전하게 공유하는 방향을 택하지만, 플러그인이나 설정이 빠뜨린 입력이 있으면 다른 checkout의 결과가 남을 수 있다. worktree별 임시 폴더는 이 저장소의 병렬 세션을 서로 격리하고, 입력이 바뀔 때만 `--clear`를 쓰면 평소의 빠른 재시작도 유지한다.

fingerprint마다 새 캐시 폴더를 만드는 대신 worktree마다 하나의 폴더를 계속 쓴다. 변경을 발견했을 때 Expo의 공식 초기화 경로를 실행하면 오래된 캐시 세대를 따로 세고 지우는 코드가 필요 없다. 전체 `bun.lock`을 읽으므로 모바일과 관계없는 패키지 변경에도 한 번 더 초기화할 수 있지만, 잘못된 캐시를 재사용하는 것보다 비용이 작고 동작을 설명하기 쉽다.

## 재검토 조건

- 같은 컴퓨터에서 같은 slug의 저장소 clone을 둘 이상 동시에 실행해야 할 때
- Expo Web이나 브라우저 자동화에 worktree별 고정 hostname이 필요할 때
- OAuth callback, CORS, 쿠키 또는 localStorage를 worktree별 hostname으로 분리해야 할 때
- 한 플랫폼에 기기를 여러 대 붙이거나 세 대 이상을 동시에 실행해야 할 때
- 두 기기를 함께 띄우는 자원 사용이 일상 개발을 방해할 때
- `10.0.2.2`가 닿지 않는 Android 실행 환경을 기본으로 지원해야 할 때
- Expo가 `process.env.EXPO_OS` 치환을 바꾸거나 그만둘 때
- 실제 기기나 원격 기기를 기본 개발 대상으로 지원할 때
- 공유 Supabase 때문에 서로 다른 스키마 변경을 동시에 검증하지 못하는 일이 반복될 때
- 공용 네이티브 빌드가 쌓여 저장 공간 관리가 필요할 때
- 모바일과 관계없는 `bun.lock` 변경 때문에 Metro의 차가운 시작이 반복될 때
- Expo가 worktree별 캐시 경계를 공식 지원하거나 공유 캐시의 모든 입력을 안정적으로 구분할 때
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
- 플랫폼마다 Metro를 따로 띄우기: 주소가 갈린 채로도 동시 실행을 얻지만 Metro 프로세스와 변환 캐시가 두 배가 되고 포트와 상태 관리가 늘어난다.
- 세션이 완성된 주소를 넘기기: 번들에 박히는 값이 플랫폼마다 갈려 Metro 하나가 두 플랫폼을 서빙하지 못한다.
- `adb reverse`로 API와 Supabase 포트까지 넘겨 주소를 통일하기: 동작하지만 Expo 생태계에서 덜 흔한 조합이고, 넘기지 못했을 때 주소가 멀쩡해 보이는 채로 실패해 진단이 어렵다.
- 앱에서 `Platform.OS`로 호스트 계산: `apps/mobile/env.ts`가 `react-native`를 import하게 되어 이 파일을 그대로 쓰는 개발 세션 스크립트가 깨진다. `process.env.EXPO_OS`는 같은 판단을 순수 JavaScript로 한다.
- 플랫폼을 바꿀 때 이전 플랫폼을 내리기: 명령의 소유 범위는 분명하지만 두 플랫폼을 나란히 비교할 수 없고 전환마다 API와 Metro 재시작을 감수해야 한다.
- 빈 `bun run dev`로 두 플랫폼 시작: 가장 치기 쉬운 명령이 가장 비싼 실행이 되고, Android 도구가 없는 컴퓨터에서 항상 절반만 성공하는 명령이 된다. 모바일 CLI 계열에 선례가 없다.
- `dev all` 키워드: 모바일 쪽 선례가 Flutter의 문서화되지 않은 `-d all`뿐이다. 필요가 확인되면 나열 형태 위에 별칭으로 얹는다.
- worktree마다 앱 이름이나 slug를 바꿔 dev launcher 목록에서 구분: 앱 정체성이 native fingerprint에 들어가 공용 빌드 공유가 깨진다. 구분은 기기 이름과 `dev:status`의 매핑으로 한다.
- 일반 모바일 URL을 개발 세션에서 덮어쓰기: Expo SDK 57 개발 번들이 `.env.local` 값을 다시 우선하므로 최종 앱 주소를 보장하지 못한다.
- 모든 시작에 `expo start --clear` 사용: 단순하지만 입력이 그대로인 실행에서도 따뜻한 캐시를 버린다.
- Metro 캐시를 모든 worktree가 그대로 공유: Expo가 의도한 빠른 경로지만, 이 저장소에서는 새 Metro 프로세스가 이전 `expo-router` 결과를 읽은 일이 실제로 있었다.
- fingerprint를 Metro 변환 키에 절대 경로로 넣기: 위치에 따라 달라지는 변환 결과를 숨기고 worktree 간 안전한 캐시 공유를 막는다.
- fingerprint마다 새 캐시 폴더 만들기: 자동 초기화와 같은 결과를 내면서 오래된 폴더를 세고 지우는 수명 관리가 추가된다.
- `watchman watch-del-all`과 `node_modules` 재설치 자동화: 다른 프로젝트의 watcher를 끊고 실제 의존성 손상과 Metro 캐시 문제를 구분하기 어렵게 만든다.

## 보존할 근거

- 현재 API 개발 명령은 `3900`을 사용하고 Metro 기본 포트는 `8081`이다.
- Android Emulator에서 호스트의 loopback 서비스는 `10.0.2.2`로 접근하거나, `adb reverse tcp:<포트> tcp:<포트>`로 기기의 `127.0.0.1:<포트>`를 호스트로 넘겨야 한다. iOS Simulator는 `127.0.0.1`을 그대로 사용한다.
- Expo SDK 57의 `expo/virtual/env` 개발 변환은 `.env` 파일 값을 `process.env` 뒤에 합친다. Expo 이슈 `#41981`과 열린 PR `#41999`도 셸 값이 `.env` 값에 덮이는 같은 동작을 다룬다.
- Expo SDK 57의 플랫폼별 native fingerprint는 서로 다르므로 공용 빌드는 플랫폼별로 구분해야 한다.
- 현재 앱에서 `EXPO_PUBLIC_API_URL`만 `http://127.0.0.1:3900`과 `http://127.0.0.1:3910`으로 바꿔 만든 iOS native fingerprint는 모두 `4a36fb8683f551d9b9cf800effec1f673b736511`이었다. slot별 API 포트는 공용 네이티브 빌드 재사용을 막지 않는다.
- 삭제한 `.claude/worktrees/hello-8dab8b`에서 만든 Gradle 결과를 다른 worktree가 `FROM-CACHE`로 읽었고, 존재하지 않는 `AndroidManifest.xml` 절대 경로를 열려다 `:app:packageDebug`가 실패했다. Metro와 API가 정상이어도 전역 Gradle 캐시는 별도로 격리해야 한다는 직접 근거다.
- Gradle 공식 문서는 daemon의 기본 유휴 종료 시간이 3시간이며, `GRADLE_OPTS`의 `-Dorg.gradle.daemon=false`로 daemon을 끌 수 있다고 설명한다. [Gradle Daemon](https://docs.gradle.org/current/userguide/gradle_daemon.html)
- 패키지를 올린 뒤 새 Metro 프로세스를 시작했는데도 `expo-router@57.0.11` 경로가 번들에 남았다. 같은 checkout을 새 `TMPDIR`로 시작하자 현재 설치 버전인 `expo-router@57.0.13`을 사용했다. 실행 중이던 프로세스 재사용이 아니라 OS 임시 폴더 아래 캐시가 관여했다는 직접 근거다.
- Expo 공식 문서는 설정 변경 뒤 `expo start --clear`를 안내한다. Expo의 Worklets cache-key 수정 [PR #39541](https://github.com/expo/expo/pull/39541)은 서로 다른 프로젝트의 전역 변환 캐시가 섞일 수 있음을 재현했고, 동시 worktree 캐시 쓰기 수정 [PR #46171](https://github.com/expo/expo/pull/46171)은 공유 캐시가 Expo의 기본 방향임을 보여 준다.
- Expo worktree 캐시 분리 제안 [PR #43113](https://github.com/expo/expo/pull/43113)은 같은 문제 부류를 확인했지만 닫혔다. 유지보수자는 절대 경로로 캐시를 무효화하기보다 위치에 따라 달라지는 변환 결과를 고쳐야 한다고 설명했다. 이 저장소의 `TMPDIR` 분리는 Metro의 변환 키를 바꾸지 않는 로컬 실행 경계다.
- 서로 다른 worktree에서 `expo run:ios`를 동시에 실행하면 두 번째 실행이 다른 worktree의 시뮬레이터를 가로채던 버그 [expo/expo#42611](https://github.com/expo/expo/issues/42611)은 [PR #43673](https://github.com/expo/expo/pull/43673)이 2026-03에 수정해 `@expo/cli`에 들어갔다. 이 저장소의 기기 풀은 이 버그가 아니라 worktree별 앱 데이터와 로그인 상태의 소유권 때문에 존재하므로, 이 수정은 기기 풀 구조를 바꿀 이유가 아니다.
- Expo는 Metro 변환 캐시 key에서 절대 경로를 의도적으로 배제하고, monorepo의 동일 구조 프로젝트를 구분하는 상대 프로젝트 루트를 key에 넣었으며([PR #29733](https://github.com/expo/expo/pull/29733)), Babel 설정 변경의 캐시 무효화를 자동화했다([PR #45260](https://github.com/expo/expo/pull/45260), [PR #45495](https://github.com/expo/expo/pull/45495)). 재검토 조건 "공유 캐시의 모든 입력을 안정적으로 구분할 때"를 향한 진행이지만, 이 저장소가 겪은 패키지 교체 사례(위의 `expo-router` 항목)는 이 수정들이 덮지 않으므로 worktree별 캐시 격리는 유지한다.
