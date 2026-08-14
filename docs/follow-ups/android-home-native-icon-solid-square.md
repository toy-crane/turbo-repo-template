# Android 홈의 네이티브 아이콘이 검은 사각형으로 보인다

**Symptom**: Android 홈의 상단 `새 대화` 네이티브 아이콘이 그림 대신 검은 사각형으로 보인다.

**Observed evidence**: 2026-08-14 Android Emulator의 Development Build에서 로그인과 온보딩을 마친 뒤 홈을 열었다. 상단 `Home` 왼쪽에 검은 사각형이 보였고, 접근성 트리는 같은 위치의 동작을 `새 대화`로 읽었다. 대화 화면에서 홈으로 돌아온 뒤에도 같은 모양이 반복됐으며 이 동작을 누르면 새 대화 화면은 정상적으로 열렸다.

**Suspected cause**: Expo Router 네이티브 탭 또는 툴바에 넘긴 Android 이미지가 마스크나 tint 처리와 맞지 않아 이미지 전체가 채워지는 것으로 보인다. 아이콘 파일과 Android 쪽 렌더링 옵션은 아직 확인하지 않았다.

**What was tried**: 첫 홈 진입과 대화 화면에서 돌아온 뒤의 홈을 각각 screenshot과 접근성 snapshot으로 확인했다. 이번 Uniwind 스타일 작업에서는 네이티브 툴바나 아이콘 자산을 바꾸지 않았다.

**Proposed next step**: `새 대화`에 연결한 이미지 자산의 투명 영역과 Android tint 설정을 확인한다. Android Development Build에서 아이콘 윤곽이 보이는지 다시 확인하고 iOS 결과와 비교한다.
