# Android 저장이 시작되면 헤더 오른쪽 폭이 8dp 벌어진다

**Symptom**: Android `프로필` 화면에서 저장을 누르면 헤더 오른쪽 자리가 48dp에서 56dp로 넓어졌다가 저장이 끝나면 다시 좁아진다. 저장이 도는 1초 남짓 동안 앱 바 내용이 한 번 밀렸다 돌아온다. 같은 자리를 누르기 전과 누른 뒤가 다른 폭이라 화면이 흔들려 보인다.

**Observed evidence**: 2026-08-17 Android Emulator(`turbo-repo-mobile_dev_4`, density 480)에서 `adb shell uiautomator dump`로 저장 버튼의 bounds가 `[1088,168][1232,312]`, 즉 48x48dp였다. `profile-save-header-action.android.tsx`의 `PROGRESS_FRAME`은 `width: 56, height: 48`이다. 바뀌기 전 코드는 버튼과 진행 표시가 모두 같은 56x48 `FRAME`을 써서 폭이 움직이지 않았다.

**Suspected cause**: Material 3 `FilledIconButton`이 자기 크기를 정하고 그 값이 48dp인데, 진행 표시의 프레임만 예전 값 56dp로 남아 있다.

**What was tried**: 아직 손대지 않았다. 두 상태의 시각적 구분을 확인하는 것이 이번 작업의 범위였고, 폭 차이는 검토에서 뒤늦게 나왔다.

**Proposed next step**: `PROGRESS_FRAME`의 `width`를 버튼과 같은 48로 맞추고 Android에서 저장을 눌러 앱 바가 움직이지 않는지 확인한다. Material이 버튼 크기를 바꿀 수 있으므로 숫자를 두 곳에 적기보다 한 상수로 묶는다.
