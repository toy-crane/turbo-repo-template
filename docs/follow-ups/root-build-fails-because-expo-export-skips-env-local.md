# 루트 `bun run build`가 `.env.local`이 있어도 모바일 환경 변수 없음으로 실패한다

**Symptom**: `apps/mobile/.env.local`에 필요한 다섯 개 공개 환경 변수가 모두 있는데도
루트에서 `bun run build`를 실행하면 `@repo/mobile#build`가 `Invalid mobile environment
variables`로 멈춘다. 다섯 변수가 모두 `undefined`로 보고된다. 이 때문에 루트 빌드
명령 전체가 실패한다.

**Observed evidence**: 2026-08-20에 worktree
`.claude/worktrees/shape-idea-expo-reference-docs-708661`에서 확인했다.
`apps/mobile/.env.local`에 `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`EXPO_PUBLIC_SUPABASE_URL`이 모두 있다. 그대로 `bun run build:ios`를 실행하면
`apps/mobile/env.ts:59`의 `parseMobileEnv`가 다섯 개를 모두 `undefined`로 보고하며
종료한다. 같은 폴더에서 `set -a && . ./.env.local && set +a`로 값을 셸에 올린 뒤
같은 명령을 실행하면 `Exported: dist/ios`까지 성공한다. `NODE_ENV=development`를
붙여도 결과는 같다. 이 저장소의 `README.md`는 `expo export`가 같은 환경 변수 계약을
확인한다고 적어 두었으므로 `.env.local`이 읽히는 것이 이 저장소의 기대 동작이다.

**Suspected cause**: `expo export`가 앱 설정을 읽는 시점이 `@expo/env`의 `.env` 파일
로딩보다 앞서거나, 이 경로에서 로딩을 아예 지나간다고 본다. `NODE_ENV`를 바꿔도
결과가 같아서 mode별 파일 선택 규칙 문제로 보이지 않는다. `expo start`와
`expo run:*`에서도 같은지는 확인하지 않았다.

**What was tried**: 값을 셸에 올려 `expo export`가 성공하는 것만 확인했다. 이것은
원인 확인용 진단이고 저장소에 남긴 변경이 아니다. `bun run build`는 여전히
`@repo/mobile#build`에서 실패한다. 이 증상은 웹 앱을 더하기 전 상태에서도 그대로
재현되므로 `apps/web` 추가와 무관하다.

**Proposed next step**: `expo start`와 `expo run:ios`에서도 `.env.local`이 읽히지
않는지 먼저 확인한다. 세 명령 모두 같다면 `@expo/env`의 로딩 시점 문제로 보고
Expo SDK 57의 동작을 확인한다. `expo export`에서만 나타나면 `apps/mobile`의
`build:ios`와 `build:android`가 값을 명시적으로 넘기도록 고친다.
