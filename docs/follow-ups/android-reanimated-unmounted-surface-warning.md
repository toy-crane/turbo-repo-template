# Android 화면 전환에서 Reanimated 마운트 경고가 반복된다

**Symptom**: Android 앱에서 화면을 전환할 때 Reanimated가 이미 사라진 화면의 태그를 찾지 못했다는 경고를 짧은 시간에 반복한다.

**Observed evidence**: 2026-08-14 Android Emulator의 Development Build 로그에서 `Reanimated`의 `RetryableMountingLayerException: Unable to find SurfaceMountingManager for tag: [150]`이 11:16:19에 여러 번 이어졌다. 앱은 종료되지 않았고 이후 인증, 온보딩, 대화 생성은 계속 동작했다.

**Suspected cause**: 화면이 사라진 뒤에도 해당 화면의 Reanimated 작업이 한 프레임 이상 실행되면서 이미 해제된 surface tag를 갱신하는 것으로 보인다. 어떤 화면의 애니메이션인지 아직 좁히지 않았다.

**What was tried**: 변경 화면을 다시 시작한 뒤 인증된 대화 화면이 열리는지 확인했고, 재시작 직후에는 같은 경고가 다시 나오지 않았다. 이번 Uniwind 스타일 작업에서는 Reanimated 동작이나 화면 전환 코드를 바꾸지 않았다.

**Proposed next step**: Android 로그를 비운 뒤 인증, 온보딩, 대화 화면 전환을 하나씩 반복해 경고가 시작되는 전환을 찾는다. 해당 화면이 사라질 때 애니메이션과 타이머를 정리하는지 확인한다.
