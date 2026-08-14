# Android 프로필 화면의 입력 라벨이 앱 글자색을 따르지 않는다

**Symptom**: Android 프로필 화면에서 `닉네임`, `아이디` 라벨, 아이디 제한 안내, 카메라 거부 안내와 아이디 후보 행이 앱의 `foreground` 색을 받지 못한다. 화면 모드에 따라 글자가 배경에 묻힐 수 있다.

**Observed evidence**: 2026-08-14 `apps/mobile/src/screens/settings/profile-edit-screen.tsx`를 읽었다. 이 화면의 `@expo/ui` `Text` 중 색을 직접 지정한 것은 문제 문구의 `problemStyle`뿐이고, 위 항목들은 `textStyle` 없이 렌더링한다. 같은 저장소의 `settings-screen.tsx:57-59`는 "Android's @expo/ui text does not follow the app's appearance on its own"이라고 적고 모든 평문에 `foreground`를 넘긴다. [모바일 색상 시맨틱](../decisions/mobile-color-semantics.md)도 Uniwind CSS 변수가 `@expo/ui`의 `Host` 안으로 전파되지 않는다고 정해 두었다. 실기기에서 눈으로 확인하지는 않았다.

**Suspected cause**: 이 화면은 설정 화면과 달리 `foreground`를 받지 않은 채로 만들어졌다. 계정 탈퇴 안내를 더하면서 `foreground` prop과 `androidTextStyle`이 이 화면에 들어왔지만, 그 안내 한 줄에만 적용했다.

**What was tried**: 계정 탈퇴 안내 문구에만 `androidTextStyle`을 적용했다. 이전 탈퇴 안내 화면이 같은 처리를 하고 있었으므로 옮기면서 잃지 않으려는 범위였다. 나머지 문구는 [계정 탈퇴 진입 명세](../specs/account-deletion-entry/spec.md)가 "프로필 화면의 입력, 저장, 사진 편집과 아이디 제한 안내"를 범위에서 제외해 손대지 않았다.

**Proposed next step**: Android Development Build에서 Light와 Dark 모드로 프로필 화면을 열어 위 문구들이 실제로 묻히는지 확인한다. 묻히면 `androidTextStyle`을 이 화면의 나머지 평문과 `UsernameSuggestion`에도 넘긴다. 문구마다 같은 처리를 반복하게 되므로, `Host` 안의 평문이 색을 한곳에서 받는 방법도 함께 검토한다.
