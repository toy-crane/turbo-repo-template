# Android 저장 버튼이 접근성 트리에 이름 없는 버튼을 하나 더 남긴다

**Symptom**: `프로필` 화면의 Android 저장 컨트롤이 접근성 트리에 버튼 두 개로 잡힌다. 하나는 이름이 `저장`이고, 그 안쪽에 이름이 비어 있는 버튼이 하나 더 있다. 화면 읽기가 두 번째 버튼에 멈추면 읽을 것이 없다.

**Observed evidence**: 2026-08-17 Android Emulator(`turbo-repo-mobile_dev_4`)의 Development Build에서 `adb shell uiautomator dump`로 확인했다. 헤더 오른쪽 영역 `bounds="[1088,168][1232,312]"` 안에 `class="android.widget.Button" content-desc="저장" clickable="true" focusable="true"`가 있고, 그 아래 `androidx.compose.ui.platform.ComposeView` 안에 `NAF="true" class="android.widget.Button" content-desc="" clickable="true" focusable="true"`가 하나 더 있다. `agent-device snapshot`도 같은 화면을 `Button "저장"`과 이름 없는 `Button` 두 줄로 보고했다.

**Suspected cause**: Compose가 자기 노드를 직접 접근성 서비스에 제공하므로 React Native 쪽 `importantForAccessibility`가 그 안까지 닿지 않는 것으로 보인다. `@expo/ui/jetpack-compose 57.0.11`의 `IconButton` 계열은 이름을 받을 수단이 없다. `Icon`의 `contentDescription`은 버튼 노드에 올라가지 않았고, `semantics` modifier는 `contentType`만 받는다.

**What was tried**: 감싸는 React Native `View`에 `accessibilityLabel`, `accessibilityRole`, `accessibilityState`를 주어 이름 `저장`과 비활성 상태가 트리에 나오게 했다. 이것으로 컨트롤을 이름으로 찾고 상태를 읽는 것은 해결됐다. 안쪽 `View`에 `importantForAccessibility="no-hide-descendants"`를 걸어 Compose 노드를 감추려 했으나 트리는 그대로였고, 뜻대로 동작하지 않는 코드라 되돌렸다. 접근성 props를 `Host`에 직접 주면 트리가 이름 있는 버튼 하나로 정리되지만 `HostProps`가 그 props를 선언하지 않아 타입이 통과하지 못하고, 선언되지 않은 전달 경로에 기대게 된다.

**Proposed next step**: 실제 TalkBack을 켜고 이 헤더를 훑어 두 번째 노드에 초점이 멈추는지, 멈춘 상태에서 두 번 누르기가 저장을 실행하는지 확인한다. 문제가 확인되면 `@expo/ui`에 Compose 버튼의 접근성 이름을 받을 수단을 요청하거나, `Host`가 접근성 props를 타입으로 선언하도록 요청한다.
