# 인증 컴포넌트 테스트에서 overlapping act 경고가 반복된다

**Symptom**: 인증 화면 컴포넌트 테스트는 통과하지만 React가 `You seem to have overlapping act() calls` 오류를 여러 번 출력한다.

**Observed evidence**: 2026-08-14에 `apps/mobile`에서 `bun run test --runInBand src/shared/ui/button.test.tsx src/features/chat/ui/latest-message-button.test.tsx src/features/chat/ui/waiting-answer.test.tsx src/features/auth/ui/sign-in-method-screen.test.tsx src/features/auth/ui/sign-in-email-screen.test.tsx src/features/auth/ui/sign-in-code-screen.test.tsx`를 실행했다. 6개 테스트 모음의 테스트 42개는 통과했지만 `sign-in-method-screen.test.tsx`와 `sign-in-email-screen.test.tsx`에서 같은 경고가 반복됐다.

**Suspected cause**: `renderWithHeroUI`, 테스트의 `act()` 또는 비동기 사용자 동작 중 하나가 이전 `act()` 범위가 끝나기 전에 다음 범위를 시작하는 것으로 보인다. 정확한 호출 지점은 아직 확인하지 않았다.

**What was tried**: 테스트 모음을 `--runInBand`로 직렬 실행해 테스트 파일 사이의 동시 실행을 없앴다. 테스트는 통과했지만 경고는 남았다. 이번 Uniwind 스타일 작업에는 우회 코드를 넣지 않았다.

**Proposed next step**: 두 테스트 파일을 각각 실행해 경고를 만드는 테스트를 좁힌 뒤 `renderWithHeroUI`와 해당 테스트의 `act()` 경계를 확인한다. 사용자 동작을 이미 감싸는 테스트 도구 위에 수동 `act()`를 겹쳐 쓴 곳부터 점검한다.
