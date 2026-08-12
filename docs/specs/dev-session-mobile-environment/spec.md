# 개발 세션 모바일 환경 설정 명세

## 목표

루트의 `bun run dev <ios|android>`가 정한 API와 Supabase 주소를 Expo 개발 번들에 정확히 전달한다. 기본 저장소 폴더와 추가 Git worktree에서 같은 규칙을 사용하고, 사용자가 `apps/mobile/.env.local`에 둔 일반 실행 및 원격 환경 설정은 수정하지 않는다.

Expo SDK 57의 개발 번들은 셸의 `EXPO_PUBLIC_` 값 뒤에 `.env.local` 값을 다시 합친다. 따라서 개발 세션은 일반 환경 변수와 다른 이름을 사용해 두 값이 경쟁하지 않게 한다.

## 적용할 결정

- [Worktree 개발 세션](../../decisions/worktree-development-sessions.md)
- [모바일 환경 설정](../../decisions/mobile-environment-configuration.md)
- [Supabase 클라이언트 경계](../../decisions/supabase-client-boundaries.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 확정한 동작

- `bun run dev ios`와 `bun run dev android`는 다음 개발 세션 전용 공개 환경 변수를 Metro에 전달한다.
  - `EXPO_PUBLIC_DEV_SESSION_API_URL`
  - `EXPO_PUBLIC_DEV_SESSION_SUPABASE_URL`
- 개발 세션 전용 값에는 플랫폼과 worktree slot을 반영한 전체 URL을 넣는다.
- 모바일 앱은 개발 세션 전용 URL이 있으면 이를 일반 URL보다 우선한다.
- 개발 세션 전용 URL이 없으면 기존 `EXPO_PUBLIC_API_URL`과 `EXPO_PUBLIC_SUPABASE_URL`을 사용한다.
- 개발 세션 전용 URL도 기존 모바일 환경 설정과 같은 URL 규칙으로 검증한다.
- 개발 세션은 `.env.local`을 만들거나 수정하거나 삭제하지 않는다.
- 이 규칙은 기본 Git checkout, 추가 worktree와 detached HEAD에서 똑같이 적용한다. 브랜치 이름은 환경 선택에 사용하지 않는다.

## 주소 규칙

| 대상 | API | Supabase |
| --- | --- | --- |
| iOS Simulator | `http://127.0.0.1:<api-port>` | `http://127.0.0.1:54321` |
| Android Emulator | `http://10.0.2.2:<api-port>` | `http://10.0.2.2:54321` |

일반 실행, 수동 진단과 배포에서 개발 세션 전용 값이 없으면 `.env.local` 또는 빌드 환경의 일반 URL을 그대로 사용한다.

## 제외할 범위

- `.env.local`을 플랫폼에 맞춰 자동으로 고치거나 복구하는 동작
- 앱이 `Platform.OS`로 호스트나 포트를 다시 계산하는 동작
- `Constants.expoConfig.hostUri`를 API 주소로 사용하는 동작
- `app.config.ts`의 `extra`를 새 환경 설정 통로로 사용하는 동작
- 캐시 삭제를 정상 실행 절차에 넣는 동작
- Expo SDK 내부 Metro resolver 또는 `expo/virtual/env`를 바꾸는 동작
- Android API와 Supabase 포트에 `adb reverse`를 추가하는 동작

## 완료 조건

1. 개발 세션 환경을 만들면 일반 URL은 보존되고 개발 세션 전용 URL에는 플랫폼과 slot에 맞는 주소가 들어간다.
2. 두 종류의 URL이 모두 있을 때 `getMobileEnv()`는 개발 세션 전용 URL을 최종 API와 Supabase 주소로 반환한다.
3. 개발 세션 전용 URL이 없으면 `getMobileEnv()`는 기존 일반 URL을 반환한다.
4. 개발 세션 전용 URL이 유효하지 않으면 앱이나 관련 프로세스를 시작하기 전에 환경 설정 검증이 실패한다.
5. `.env.local`에 `127.0.0.1`이 있고 Android 개발 세션에 `10.0.2.2`가 있어도 최종 Android 개발 번들의 런타임 환경은 `10.0.2.2`를 사용한다.
6. iOS 개발 세션과 일반 실행의 기존 주소 동작이 유지된다.

## 남은 위험

- Expo가 개발 번들의 환경 변수 변환 방식을 바꾸면 충돌 자체는 사라질 수 있다. 별도 이름은 그 뒤에도 개발 세션과 일반 설정의 소유권을 구분하므로 유지할 수 있다.
- 두 URL 쌍이 함께 존재하므로 새 네트워크 소비자가 일반 URL을 직접 읽으면 개발 세션 우선순위를 빠뜨릴 수 있다. 앱 코드는 계속 `getMobileEnv()`만 사용해야 한다.

## 상태

ready for implementation
