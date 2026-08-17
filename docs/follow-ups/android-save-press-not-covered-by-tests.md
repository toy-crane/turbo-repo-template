# Android 저장 버튼을 눌렀을 때 저장이 불리는지 확인하는 테스트가 없다

**Symptom**: `profile-save-header-action.test.tsx`가 이름, 비활성 상태와 진행 표시는 확인하지만 누르면 `onPress`가 불리는지는 확인하지 않는다. `FilledIconButton`에서 `onClick={onPress}`가 빠져도 모든 테스트가 통과한다. 바뀌기 전 테스트에는 이 확인이 있었다.

**Observed evidence**: 2026-08-17 기준 `apps/mobile/src/screens/settings/profile-save-header-action.test.tsx`의 세 테스트 모두 `onPress`에 `jest.fn()`을 넘기지만 호출을 단언하지 않는다. 실제 누르기는 Android Emulator에서 `adb shell input tap`으로 한 번 확인했고, 저장 뒤 값이 남는 것까지 봤다.

**Suspected cause**: 누르기가 Compose 버튼 안에 있어서 Jest가 그리지 못한다. 그래서 `@expo/ui/jetpack-compose`를 대역으로 바꿨는데, 그 대역이 `onClick`을 넘겨받지 않아 누를 방법이 없다.

**What was tried**: 대역이 `enabled`만 전달하도록 두고, 누르기는 기기 확인으로 대신했다.

**Proposed next step**: 대역 `FilledIconButton`이 `onClick`을 `Pressable`이나 `View`의 `onPress`로 넘기게 고치고, 눌렀을 때 `onPress`가 한 번 불리는지, 비활성일 때는 불리지 않는지 확인하는 테스트를 더한다.
