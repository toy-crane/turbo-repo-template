# 답변 대기 테스트가 잘못된 그라디언트 색 경고를 출력한다

**Symptom**: `WaitingAnswer` 테스트는 통과하지만 `react-native-svg`가 `invalid`는 올바른 색이 아니라는 경고를 반복한다.

**Observed evidence**: 2026-08-14에 저장소 루트에서 `bun run test`를 실행했다. 모바일 테스트 46개 모음의 테스트 298개는 모두 통과했지만 `waiting-answer.test.tsx`를 실행하는 동안 `"invalid" is not a valid color` 경고가 그라디언트의 `0%`와 `100%` 지점에서 반복됐다.

**Suspected cause**: 테스트의 Uniwind 색 해석 mock이 실제 색 대신 `invalid`를 돌려주고, `LinearGradient`가 이 값을 검사하면서 경고하는 것으로 보인다. 제품 실행에서는 light와 dark 토큰 색이 정상으로 보였다.

**What was tried**: Android와 iOS Development Build에서 답변 대기와 채팅 색을 확인했고 화면 오류는 보이지 않았다. 이번 Uniwind 스타일 작업에서는 그라디언트의 색 해석 코드나 테스트 mock을 바꾸지 않았다.

**Proposed next step**: Uniwind 색 해석 mock이 `muted`와 `background`에 유효한 테스트 색을 돌려주게 한 뒤, `WaitingAnswer` 테스트가 경고 없이 통과하는지 확인한다.
