# Android에서 Stack.Toolbar의 글자 버튼이 그려지지 않는다

**Symptom**: Android에서 시트 화면의 헤더 오른쪽에 닫기 버튼이 보이지 않는다.
`Side chat` 시트의 `Side chat 닫기`와 설정 시트의 `설정 닫기` 둘 다 화면에도
접근성 트리에도 없다. iOS에서는 두 버튼 모두 정상으로 보인다.

**Observed evidence**: Development Build를 `turbo-repo-mobile_dev_1`
에뮬레이터에서 열고 `agent-device snapshot --raw`로 앱 바 영역
(`y < 400`)의 노드를 모두 확인했다. `Side chat` 시트에는 제목
`TextView "Side chat"`과 Expo dev client의 `Tools` 아이콘만 있고 버튼 노드가
없다. `turbo-repo-mobile://settings`로 연 설정 시트도 제목 `TextView "설정"`만
있고 `설정 닫기`가 없다. 두 화면의 스크린샷에서도 오른쪽 위에는 dev client의
톱니 아이콘뿐이다.

**Suspected cause**: `Stack.Toolbar.Button`에 글리프를 `icon` prop이 아니라
자식 글자로 주면 Android에서 항목이 그려지지 않는다. 두 화면 모두 Android
분기에서 `<Stack.Toolbar.Button ...>닫기</Stack.Toolbar.Button>` 형태를 쓰고,
`icon` prop으로 이미지를 주는 헤더 버튼(`뒤로 가기`, `새 대화`, `프로필`)은
Android에서 정상으로 보인다.

**What was tried**: 이번 작업에서는 고치지 않았다. Android의 시스템 뒤로 가기가
시트만 닫고 부모 대화를 그대로 두는 것을 확인해, Side chat의 닫기와 다시 열기
흐름 자체는 Android에서도 동작한다. 헤더에 누를 수 있는 닫기 버튼이 없는 상태는
그대로 남는다. 설정 시트도 같은 상태이므로 이번 변경이 만든 회귀는 아니다.

**Proposed next step**: `assets/toolbar/`에 Material Symbols의 `close` 글리프를
1x, 2x, 3x로 내보내 `toolbarIcons`에 `close`를 더하고, 두 시트의 Android 분기를
`icon={toolbarIcon("close")}`로 바꾼 뒤 에뮬레이터에서 두 버튼이 접근성 트리에
나오는지 확인한다.
