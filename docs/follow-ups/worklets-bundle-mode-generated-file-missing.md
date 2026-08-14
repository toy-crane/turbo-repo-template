# Metro가 Worklets Bundle Mode 생성 파일을 찾지 못한다

**Symptom**: `bun run dev ios` 또는 `bun run dev android`로 앱을 열 때 Metro가
`react-native-worklets/.worklets/<hash>.js`를 읽지 못해 번들을 500 오류로 끝낼 수
있다.

**Observed evidence**: iOS와 Android Development Build에서 각각
`ENOENT: no such file or directory, open '.../react-native-worklets/.worklets/<hash>.js'`
오류가 났다. 오류가 난 시점에 `.worklets` 폴더에는 `dummy.md`만 있었다.

**Suspected cause**: Metro 변환 캐시에는 Worklets Babel 플러그인이 만든
`require("react-native-worklets/.worklets/<hash>.js")` 결과가 남지만, 변환의 부수
효과로 만든 실제 파일은 `node_modules` 갱신이나 플랫폼 전환 뒤 남지 않는 것으로
보인다. Metro가 캐시된 변환 결과를 쓰면 플러그인을 다시 실행하지 않아 파일도
다시 만들지 않는다.

**What was tried**: 개발 세션이 Expo를 시작할 때 일시적으로 `--clear`를 넘겼다.
Metro가 캐시를 비우고 번들을 다시 만들자 `.worklets` 파일 649개가 생겼고 iOS와
Android 번들이 모두 끝났다. 확인 뒤 임시 인수는 되돌렸으며 앱 설정은 바꾸지
않았다.

**Proposed next step**: `.worklets` 생성 파일이 없는 상태와 Metro 변환 캐시가 남은
상태를 재현한 뒤, 개발 세션 시작 코드가 이 조합을 감지해 해당 worktree의 Metro
캐시만 안전하게 비우도록 한다.
