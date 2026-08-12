# Worktree 개발 세션 명세

## 목표

기본 저장소 폴더와 여러 Git worktree에서 같은 Expo 앱을 동시에 개발해도 API·Metro 포트, Development Build와 기기 상태가 서로 섞이지 않게 한다. 루트 명령 하나가 현재 실행 폴더의 API, Metro와 전용 Simulator 또는 Emulator를 시작하고 준비가 끝나면 백그라운드 실행으로 전환한다.

같은 플랫폼과 native fingerprint로 이미 만든 Development Build가 있으면 저장소의 다른 worktree에서도 빌드 결과를 재사용한다. 앱 데이터와 로그인 상태는 worktree별 전용 기기에 남긴다.

## 적용할 결정

- [Worktree 개발 세션](../../decisions/worktree-development-sessions.md)
- [모바일 개발 런타임](../../decisions/mobile-development-runtime.md)
- [모바일 환경 설정](../../decisions/mobile-environment-configuration.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)
- [Supabase 스키마 작업 방식](../../decisions/supabase-schema-workflow.md)

## 공개 명령

첫 버전은 다음 명령만 제공한다.

```bash
bun run dev
bun run dev android
bun run dev:stop
bun run dev:remove
```

- `bun run dev`는 iOS 개발 세션을 시작한다.
- `bun run dev android`는 Android 개발 세션을 시작한다.
- 시작 명령은 API와 Metro가 응답하고 앱이 지정한 기기에서 열릴 때까지 기다린다. 준비가 끝나면 포트, 기기 이름과 로그 파일 위치를 출력하고 터미널을 돌려준다.
- 같은 worktree에서 같은 플랫폼이 이미 실행 중이면 프로세스를 중복 생성하지 않고 앱을 다시 열고 현재 정보를 출력한다.
- 다른 플랫폼이 실행 중이면 그 세션을 정상 종료한 뒤 요청한 플랫폼으로 전환한다. 플랫폼별 기기와 앱 데이터는 그대로 유지한다.
- `bun run dev:stop`은 현재 worktree에서 개발 세션이 실행 중이지 않아도 성공한다.
- `bun run dev:remove`는 현재 worktree의 개발 자원만 삭제한다. Git worktree 자체는 삭제하지 않는다.
- 별도의 `start`, `status`, `logs`, `prune`, `repair`, `baseline` 명령은 만들지 않는다.

루트 `bun run dev`가 일반 개발의 유일한 기본 경로다. 아래 앱별 명령은 수동 진단 경로로만 남긴다.

```bash
bun run --cwd apps/api dev
bun run --cwd apps/mobile start
bun run --cwd apps/mobile ios
bun run --cwd apps/mobile android
```

앱별 명령은 slot, 전용 기기와 프로세스 소유권을 관리하지 않으므로 여러 worktree를 동시에 실행할 때 사용하지 않는다.

## 실행 단위와 저장소 단위

Git의 기본 checkout도 하나의 worktree다. 브랜치 이름과 관계없이 현재 Git worktree 루트의 정규화된 실제 절대 경로를 실행 단위로 사용한다.

```text
Git 저장소
├─ 기본 worktree 경로
│  ├─ 고정 slot
│  ├─ 전용 iOS Simulator
│  └─ 전용 Android AVD
├─ 추가 worktree A 경로
│  ├─ 고정 slot
│  ├─ 전용 iOS Simulator
│  └─ 전용 Android AVD
└─ 추가 worktree B 경로
   ├─ 고정 slot
   ├─ 전용 iOS Simulator
   └─ 전용 Android AVD

저장소 공용 영역
└─ 플랫폼과 native fingerprint별 Development Build
```

- 같은 폴더에서 브랜치를 바꿔도 slot과 기기는 유지한다.
- detached HEAD도 폴더 경로로 식별하므로 별도 처리가 필요 없다.
- 사람이 보는 label에는 브랜치 이름을 우선 사용할 수 있지만 소유권 판단에는 사용하지 않는다.
- 같은 저장소에 속하는지는 정규화된 Git common directory로 판단한다. 공용 빌드와 동시 실행 상태는 이 저장소 단위로 공유한다.

## 세션 상태

사용자 로컬 캐시 영역에 저장소별 상태를 둔다. 정확한 저장 경로는 구현에서 운영체제의 사용자 캐시 규칙을 따르되 Git에 포함하지 않는다.

저장소 상태는 최소한 다음 정보를 가진다.

```json
{
  "version": 1,
  "worktrees": {
    "/absolute/path/to/worktree": {
      "label": "feature-auth",
      "slot": 1,
      "activePlatform": "ios",
      "devices": {
        "ios": {
          "udid": "AAA-BBB-CCC",
          "installedFingerprint": "ios-fingerprint"
        },
        "android": {
          "avdName": "project-feature-auth",
          "installedFingerprint": "android-fingerprint"
        }
      },
      "processes": {
        "metro": {
          "pid": 1234,
          "port": 8091,
          "logPath": "/local/cache/metro.log"
        },
        "api": {
          "pid": 1235,
          "port": 3910,
          "logPath": "/local/cache/api.log"
        }
      }
    }
  }
}
```

- 여러 worktree가 동시에 시작되어도 하나의 slot이나 기기를 중복 배정하지 않아야 한다.
- 상태 변경은 잠금 안에서 수행하고 완성된 상태만 교체해 일부만 기록된 파일을 남기지 않는다.
- 실행 프로세스와 빌드 로그는 worktree별 파일에 기록한다.
- 종료할 때는 개발 세션이 시작한 프로세스만 중단한다. 기록된 PID가 다른 명령이나 다른 작업 폴더의 프로세스를 가리키면 종료하지 않는다.

## 포트 배정

worktree마다 가장 작은 빈 정수 slot을 배정한다. 기존 worktree는 같은 slot을 계속 사용한다.

| 서비스 | 계산식 | slot 0 | slot 1 | slot 2 |
| --- | ---: | ---: | ---: | ---: |
| Metro | `8081 + slot × 10` | 8081 | 8091 | 8101 |
| API | `3900 + slot × 10` | 3900 | 3910 | 3920 |

- 첫 배정에서는 두 포트가 모두 비어 있는 slot만 사용한다.
- 저장된 slot의 포트를 개발 세션이 소유하지 않은 프로세스가 사용하고 있으면 그 프로세스를 종료하지 않는다. 같은 기기는 유지하고 다른 빈 slot을 자동으로 배정한다.
- slot 변경은 API와 Metro를 시작하기 전에 확정하고 모바일 환경 값에도 같은 포트를 사용한다.
- Web 포트는 관리하지 않는다. 현재 제품은 Expo Web을 지원하지 않는다.
- Supabase 포트는 slot에 포함하지 않는다. 모든 worktree가 이미 실행 중인 같은 로컬 Supabase를 사용한다.

## 환경 설정

개발 세션은 기존 `.env.local` 파일에서 프로젝트별 값과 인증 설정을 읽는다. 동적으로 정한 API와 Supabase 주소는 자식 프로세스 환경으로 넣고 `.env.local`을 수정하지 않는다.

| 대상 | `EXPO_PUBLIC_API_URL` | `EXPO_PUBLIC_SUPABASE_URL` |
| --- | --- | --- |
| iOS Simulator | `http://127.0.0.1:<api-port>` | `http://127.0.0.1:54321` |
| Android Emulator | `http://10.0.2.2:<api-port>` | `http://10.0.2.2:54321` |

- API에는 배정한 `BUN_PORT`를 전달한다.
- `apps/mobile/env.ts`와 `app.config.ts`의 필수 환경 설정 검증을 우회하지 않는다.
- 필요한 `.env.local` 값이 없거나 유효하지 않으면 프로세스와 기기를 시작하기 전에 실패한다.
- 로컬 Supabase가 실행 중이 아니면 `bun run db:start`를 안내하고 실패한다. 개발 세션이 대신 시작하거나 초기화하지 않는다.

## 기기 수명

### 공통 규칙

- worktree와 플랫폼의 조합마다 하나의 전용 기기를 만든다.
- 같은 bundle ID 또는 Android package를 유지한다. 별도 기기를 사용하므로 worktree별 앱 variant를 만들지 않는다.
- 일반 종료에서는 기기만 shutdown하고 삭제하지 않는다.
- 앱 데이터와 로그인 상태는 기기에 남아 다음 실행에서 이어진다.
- `bun run dev:remove`는 현재 worktree에 배정된 iOS와 Android 기기를 모두 삭제한다.

### iOS

- 첫 기본값은 iOS 26.5의 iPhone 17 Pro다.
- 저장한 UDID를 기기 조작의 기준으로 사용한다. 표시 이름만으로 Simulator를 선택하지 않는다.
- 기기가 없으면 빈 Simulator를 만들고 공용 Development Build를 설치한다. 미리 앱을 설치한 기준 Simulator는 만들지 않는다.
- Metro가 준비되면 정확한 UDID에 현재 Metro 포트가 포함된 development client URL을 연다.

### Android

- 첫 기본값은 Google Play ARM64 API 35 system image의 Pixel 9 Pro다.
- AVD 이름을 지속 식별자로 저장한다. `emulator-5554` 같은 adb serial은 실행할 때마다 해당 AVD에서 다시 찾는다.
- 모든 adb 명령은 `-s <serial>`로 대상 Emulator를 지정한다.
- AVD가 없으면 `avdmanager`로 새로 만든다. 같은 AVD를 읽기 전용으로 여러 번 실행하거나 AVD 파일을 직접 복사하지 않는다.
- Metro가 준비되면 정확한 adb serial에 현재 Metro 포트가 포함된 development client URL을 연다.

필요한 iOS runtime, Android system image나 명령줄 도구가 없으면 설치를 자동 진행하지 않고 필요한 항목을 한 번에 보여 주고 실패한다.

## 공용 Development Build

공용 빌드는 Git 저장소, 플랫폼과 Expo native fingerprint의 조합으로 식별한다.

```text
<repository>/<platform>/<native-fingerprint>/artifact
```

다음 순서로 사용할 빌드를 정한다.

1. 현재 worktree에서 대상 플랫폼의 native fingerprint를 만든다.
2. 전용 기기에 같은 fingerprint의 앱이 이미 설치되어 있으면 빌드와 설치를 모두 건너뛴다.
3. 기기에 맞는 앱은 없지만 저장소 공용 빌드가 있으면 그 결과를 설치한다.
4. 공용 빌드도 없으면 현재 worktree에서 Development Build를 한 번 만든다.
5. 빌드가 성공하면 결과를 완성된 공용 항목으로 저장하고 전용 기기에 설치한다.
6. 설치가 끝난 뒤에만 기기의 `installedFingerprint`를 갱신한다.

- iOS `.app`과 Android `.apk`는 서로 다른 빌드다.
- 같은 fingerprint에 대한 빌드 요청이 동시에 들어오면 하나만 빌드하고 나머지는 그 결과를 기다려 재사용한다.
- 빌드가 실패하면 공용 항목과 설치 fingerprint를 기록하지 않는다.
- JavaScript, TypeScript와 스타일만 바뀌어 native fingerprint가 같으면 다시 빌드하지 않는다.
- 네이티브 패키지, Expo config plugin, 플랫폼 설정 또는 Expo SDK 변경으로 fingerprint가 달라지면 새 공용 빌드를 만든다.
- `bun run dev:remove`는 공용 빌드를 지우지 않는다.
- 첫 버전은 공용 빌드 목록, 수동 갱신, 삭제와 용량 제한 명령을 제공하지 않는다.

## 시작 절차

`bun run dev [android]`는 다음 결과를 만든다.

1. 현재 Git worktree와 저장소를 식별한다.
2. 필수 환경 설정과 로컬 Supabase 상태를 확인한다.
3. 기존 slot을 확인하고 필요하면 빈 slot을 배정한다.
4. 대상 플랫폼의 전용 기기를 만들거나 다시 사용한다.
5. native fingerprint와 전용 기기 및 공용 빌드 상태를 비교한다.
6. 필요하면 공용 빌드를 설치하거나 새로 빌드한다.
7. API와 Metro를 배정한 포트로 백그라운드 실행한다.
8. API health와 Metro 응답을 기다린다.
9. 정확한 기기에서 정확한 Metro URL을 연다.
10. 플랫폼, 기기, 포트, 빌드 재사용 여부와 로그 파일 위치를 출력하고 성공한다.

시작 과정에서 실패하면 이번 실행에서 새로 시작한 API와 Metro만 종료한다. slot, 이미 있던 기기와 정상적인 공용 빌드는 유지한다. 실패한 빌드나 불완전한 캐시는 재사용 가능한 상태로 기록하지 않는다.

## 종료와 삭제

### `bun run dev:stop`

- 현재 worktree에서 개발 세션이 시작한 API와 Metro를 종료한다.
- 실행 중인 대상 Simulator 또는 Emulator를 shutdown한다.
- slot, 기기, 설치된 앱, 앱 데이터, 로그인 상태와 공용 빌드는 유지한다.
- 다른 worktree의 프로세스와 기기는 건드리지 않는다.

### `bun run dev:remove`

- 먼저 `dev:stop`과 같은 종료를 수행한다.
- 현재 worktree에 배정된 모든 Simulator와 AVD를 삭제한다.
- 현재 worktree의 로그와 상태 항목을 삭제한다.
- slot을 반납한다.
- Git worktree, 소스 파일, `.env.local`, 로컬 Supabase와 저장소 공용 빌드는 삭제하지 않는다.

Git worktree를 삭제하려면 해당 폴더에서 `bun run dev:remove`를 먼저 실행한 뒤 Git 명령을 실행한다. 첫 버전은 이미 사라진 worktree를 찾아 정리하는 자동 hook이나 `prune` 명령을 제공하지 않는다.

## 완료 조건

1. 기본 저장소 폴더와 추가 worktree에서 `bun run dev`를 동시에 실행할 수 있다.
2. 두 실행은 서로 다른 API·Metro 포트와 iOS Simulator UDID를 사용한다.
3. 서로 다른 worktree에서 `bun run dev android`를 실행하면 각기 다른 AVD를 사용하고 모든 adb 명령이 정확한 serial을 대상으로 한다.
4. 같은 bundle ID와 Android package를 유지한 앱이 서로 다른 전용 기기에 동시에 설치된다.
5. 각 앱은 자신의 worktree에서 실행한 Metro와 API에 연결된다.
6. 같은 플랫폼과 native fingerprint의 첫 실행만 네이티브 빌드를 만들고 다른 worktree는 공용 결과를 설치한다.
7. JavaScript만 바꾼 뒤 다시 시작하면 네이티브 빌드와 앱 설치를 반복하지 않는다.
8. native fingerprint가 달라지면 기존 공용 빌드를 덮어쓰지 않고 새 빌드를 만든다.
9. 한 worktree를 중단하거나 삭제해도 다른 worktree의 프로세스, 기기와 공용 빌드는 유지된다.
10. 일반 종료 뒤 다시 시작하면 같은 slot, 기기와 로그인 상태를 재사용한다.
11. 알 수 없는 프로세스가 저장된 포트를 사용해도 그 프로세스를 종료하지 않고 다른 slot으로 옮긴다.
12. Android 앱은 `10.0.2.2` 주소로 현재 worktree의 API와 공유 Supabase에 연결된다.
13. `bun run dev`와 `bun run dev:stop`은 로컬 Supabase의 실행 상태나 데이터를 바꾸지 않는다.
14. 시작 명령은 앱이 열리기 전에 성공으로 끝나지 않으며, 성공할 때 로그 파일 위치를 출력한다.
15. `bun run dev:remove`는 Git worktree와 저장소 공용 빌드를 삭제하지 않는다.

## 가정

- 개발 호스트는 Xcode, iOS Simulator, Android SDK, Android Emulator와 adb를 실행할 수 있는 macOS다.
- 프로젝트별 비밀값과 공개 설정은 기존 `.env.local`에 준비되어 있다.
- 로컬 Supabase는 개발자가 별도로 시작한다.
- 기본 기기 선택은 현재 확인한 Xcode 26.6의 iOS 26.5와 Android API 35 도구 체계를 기준으로 한다.
- Development Build는 현재 프로젝트의 고정된 Expo SDK와 로컬 native toolchain으로 만든다.

## 이번 범위에서 제외할 기능

- Portless와 `.localhost` hostname
- Expo Web과 Web 포트 관리
- 실제 iPhone과 Android 기기
- 같은 worktree에서 iOS와 Android 동시 실행
- worktree별 Supabase 스택, seed와 데이터 격리
- 기준 Simulator, AVD snapshot과 읽기 전용 AVD 다중 실행
- worktree별 bundle ID, Android package와 앱 variant
- `status`, `logs`, `prune`, `repair`, `baseline` 명령
- Git worktree 삭제 hook과 이미 삭제된 worktree의 자동 정리
- 공용 빌드 삭제, 용량 제한과 오래된 빌드 자동 정리
- EAS Build, 원격 Simulator·Emulator와 CI 기기 실행

## 남은 위험

- 공유 Supabase에서 서로 다른 worktree가 호환되지 않는 schema 변경을 동시에 사용하면 한쪽 개발 세션이 실패할 수 있다.
- 공용 빌드를 자동 삭제하지 않으므로 native fingerprint가 자주 바뀌면 로컬 저장 공간을 계속 사용할 수 있다.
- `bun run dev:remove`보다 Git worktree를 먼저 삭제하면 전용 기기와 slot이 남으며 첫 버전에는 자동 복구 명령이 없다.
- 직접 실행한 앱별 `dev`, `ios`, `android`, `start` 명령은 관리 대상이 아니므로 루트 개발 세션과 함께 실행하면 포트나 기기 선택이 충돌할 수 있다.
- 고정한 Simulator runtime이나 Android system image가 로컬에서 제거되면 새 기기를 만들 수 없으며 사용자가 해당 도구를 다시 설치해야 한다.
