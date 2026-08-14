# 모바일 전체 테스트가 열린 작업을 남긴다

**Symptom**: 모바일 Jest 테스트는 모두 통과하지만 끝날 때 worker 하나를 강제로 종료했다는 경고가 나온다.

**Observed evidence**: 2026-08-14에 저장소 루트에서 `bun run test`를 실행했다. 모바일 테스트 46개 모음의 테스트 298개는 모두 통과한 뒤 `A worker process has failed to exit gracefully and has been force exited`를 출력했다.

**Suspected cause**: 어떤 테스트가 timer, 구독 또는 비동기 작업을 정리하지 않아 Jest worker가 정상 종료되지 않는 것으로 보인다. 이 실행만으로는 원인 테스트를 찾지 않았다.

**What was tried**: 전체 테스트를 일반 설정으로 한 번 실행해 경고가 전체 결과 뒤에 나오는 점을 확인했다. 이번 Uniwind 스타일 작업에서 timer나 구독 코드는 바꾸지 않았다.

**Proposed next step**: 모바일 테스트를 `--detectOpenHandles --runInBand`로 실행해 열린 작업을 만든 테스트를 찾는다. 원인 테스트의 timer, 구독, animation mock을 `afterEach`에서 정리한다.
