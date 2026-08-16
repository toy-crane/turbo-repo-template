# Side chat 직렬 진단 테스트에 빈 답변이 남는다

**Symptom**: 모바일 테스트를 `--detectOpenHandles --runInBand`로 실행하면 Side chat 메시지 목록에 빈 AI 답변이 하나 더 남아 테스트가 실패한다.

**Observed evidence**: 2026-08-17에 `bun run --cwd apps/mobile test --detectOpenHandles --runInBand`를 실행했다. `src/features/chat/state/side-chats.test.tsx`의 `Side chat 목록에는 부모 대화가 아니라 새로 주고받은 말만 담는다` 테스트가 `["이 구절이 무슨 뜻인가요"]` 대신 `["이 구절이 무슨 뜻인가요", ""]`를 받아 반복해서 실패했다.

**Suspected cause**: 직렬 진단 모드에서는 스트리밍 중 만든 빈 AI 답변 자리가 지워지기 전에 테스트가 메시지 목록을 확인하는 것으로 보인다. 아직 원인을 확정하지 않았다.

**What was tried**: 일반 `bun run test`에서는 같은 테스트를 포함한 모바일 테스트 56개 모음이 통과하는 점과, 직렬 진단 명령에서만 같은 빈 메시지가 나타나는 점을 확인했다. 관련 제품 코드와 테스트는 바꾸지 않았다.

**Proposed next step**: 이 테스트의 `ask` 도우미와 스트림 완료 처리를 단독으로 실행해 빈 AI 답변 자리를 만드는 시점과 지우는 시점을 기록하고, 메시지 상태가 끝났다는 공개 조건을 기다린 뒤 검증해야 하는지 확인한다.
