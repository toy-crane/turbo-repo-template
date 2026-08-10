# 모바일 앱 에셋 생성 명세

## 목표

템플릿에서 파생된 모바일 앱의 정체성을 바탕으로 앱 아이콘 컨셉을 고르고, iOS와 Android가 요구하는 에셋과 스플래시 이미지를 만든다. 에이전트는 시각 결정을 먼저 미리 보여 주고 사용자가 고른 결과만 프로젝트에 반영한다. 플랫폼별 파일은 하나의 상징을 공유하되 각 운영체제의 레이어와 마스크 규칙에 맞게 나눈다.

## 적용할 결정

- [모바일 앱 에셋 생성](../../decisions/mobile-app-asset-generation.md)
- [템플릿 프로젝트 정체성](../../decisions/template-project-identity.md)
- [모바일 개발 런타임](../../decisions/mobile-development-runtime.md)
- [모바일 아이콘 렌더링](../../decisions/mobile-icon-rendering.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 제공 형태

- 구현 결과는 `create-app-assets` 프로젝트 공용 Skill이다.
- 원본은 `.agents/skills/create-app-assets/SKILL.md`에 두고, `.claude/skills/create-app-assets`는 원본을 가리키는 심볼릭 링크로 만든다.
- 사용자가 앱 아이콘, adaptive icon 또는 스플래시 이미지를 만들거나 바꿔 달라고 요청하면 이 Skill을 사용한다.
- Skill은 컨셉 질문, 미리보기 생성, 승인, 최종 에셋 반영과 검증을 차례로 안내한다.
- 이미지 생성 기능을 복사하거나 별도 제공자 키를 받지 않는다. 설치된 `imagegen`을 호출해 시안과 원본 레이어를 만든다.
- 프로젝트 이름과 식별자를 정하는 `bun run setup`이나 화면 안에서 쓰는 아이콘 관리는 맡지 않는다.

## 시작 조건

- 사용자가 `bun run setup`으로 프로젝트 슬러그, 앱 표시 이름과 모바일 앱 식별자를 정한 뒤 명시적으로 에셋 생성을 요청한다.
- 앱이 누구를 위해 어떤 일을 하는지 한 문장으로 설명할 수 있어야 한다.
- 반드시 보존할 기존 로고, 색상이나 참고 이미지가 있으면 생성 전에 입력으로 받는다. 없으면 필수 입력으로 요구하지 않는다.
- 바꾸면 안 되는 상징, 글자, 색상과 피하고 싶은 표현이 있으면 제약으로 기록한다.
- 시작 조건이 부족하면 이미지를 먼저 만들지 않고 빠진 제품 정보 하나만 확인한다.

## 컨셉과 승인

- 외부 `app-icon` 스킬의 질문 구조를 참고해 앱 목적, 핵심 상징, 색상, 분위기와 피할 요소를 짧은 컨셉 문서로 만든다. 외부 스킬 설치와 SnapAI 실행은 요구하지 않는다.
- 서로 다른 방향의 컨셉 세 개를 만든다. 색만 바꾼 세 장은 서로 다른 컨셉으로 세지 않는다.
- 각 컨셉은 이름, 한 문장 설명, 주 상징, 배경, 색상, 작은 크기에서 남아야 할 특징과 피할 요소를 포함한다.
- `imagegen`은 컨셉마다 정사각형 미리보기 한 장을 만든다. 여러 컨셉을 한 장의 콜라주로 합치지 않는다.
- 미리보기 단계의 결과는 프로젝트의 활성 에셋 경로를 바꾸지 않는다.
- 사용자가 한 컨셉을 고른 뒤에는 한 번에 한 가지 차이만 바꿔 수정한다. 선택하지 않은 컨셉은 최종 에셋으로 만들지 않는다.
- 최종 승인에는 활성 아이콘과 스플래시 에셋을 교체하고 Expo 설정을 연결하는 작업이 포함된다.

## 최종 에셋

### 공통 원본

- 선택한 컨셉의 최종 프롬프트, 색상, 원본 전경 레이어와 필요한 참고 이미지를 프로젝트 안에 보관한다.
- 작은 크기에서 형태가 흐려지는 단순 상징은 SVG로 다시 그려 선과 가장자리를 정리할 수 있다.
- 같은 플랫폼의 크기별 파일은 승인한 원본에서 확정적으로 줄인다. 크기마다 `imagegen`으로 다시 만들지 않는다.

### Apple

- `apps/mobile/assets/AppIcon.icon`을 iOS의 활성 아이콘으로 사용하고 `app.json`의 `ios.icon`에서 연결한다.
- 기본 구성은 두 레이어다. 배경은 Icon Composer의 단색 또는 그라데이션이며, 전경은 배경이 투명한 하나의 상징이다.
- 세 번째 레이어는 컨셉의 뜻이나 깊이를 실제로 보존할 때만 추가한다. 장식만 늘리기 위해 추가하지 않는다.
- Icon Composer에서 기본, 다크와 tinted 표현을 모두 확인한다.
- 레이어 분리가 경계를 망가뜨리는 컨셉은 평면 아이콘으로 바꾸고 그 이유와 줄어드는 표현을 승인 전에 보여 준다.
- 최상위 `icon.png`는 Android와 일반 원본에 필요한 경로로 유지한다. `.icon` 폴더를 최상위 `icon` 값에 넣지 않는다.

### Android

- `android-icon-foreground.png`는 마스크 안에서 잘리지 않는 투명 전경 상징이다.
- `android-icon-background.png`는 전경과 분리된 꽉 찬 배경이다. 단순 배경이면 `backgroundColor`로 대신할 수 있다.
- `android-icon-monochrome.png`는 Android 13 이상의 themed icon이 색을 입힐 수 있는 단색 실루엣이다.
- 전경, 배경과 단색 이미지에 같은 완성 이미지를 반복해서 연결하지 않는다.
- 원형, 둥근 사각형과 squircle 마스크에서 핵심 상징이 잘리지 않아야 한다.

### 스플래시

- `splash-icon.png`는 승인한 앱 아이콘의 상징을 공유하되 앱 아이콘 전체를 그대로 확대한 장면으로 만들지 않는다.
- 현재 `expo-splash-screen`의 밝은 화면과 어두운 화면 배경 설정을 유지한다.
- 스플래시 이미지는 화면 크기나 안전 영역이 달라도 잘리지 않고 중앙에서 읽혀야 한다.

## 실패와 복구

- 60×60 크기에서 주 상징을 알아보기 어렵거나 세 단어 안으로 설명할 수 없으면 최종 에셋을 만들지 않고 컨셉으로 돌아간다.
- Apple 기본·다크·tinted 표현 중 하나에서 경계가 사라지거나 대비가 부족하면 해당 레이어나 색상만 고친다.
- Android 마스크에서 전경이 잘리거나 themed icon이 알아보기 어려우면 전경 여백이나 단색 실루엣을 따로 고친다.
- 투명 전경에서 테두리 색 번짐이나 불완전한 알파가 남으면 최종 파일로 쓰지 않는다. 배경 제거를 다시 하거나 단순 상징을 SVG로 다시 그린다.
- Expo 설정, prebuild 또는 Xcode asset compile이 실패하면 현재 활성 에셋을 유지하고 실패한 후보만 고친다.
- 생성 도중 중단하거나 사용자가 모든 컨셉을 거절해도 기존 에셋과 설정은 그대로 남아야 한다.

## 완료 조건

- `.agents/skills/create-app-assets/SKILL.md`가 있고 `.claude/skills/create-app-assets`가 이 원본을 가리킨다.
- 승인 전에는 `apps/mobile/assets`의 활성 에셋과 `app.json`이 바뀌지 않는다.
- 승인한 컨셉 하나만 Apple `.icon`, Android adaptive icon 세 역할과 스플래시 이미지에 반영된다.
- 생성 프롬프트와 최종 레이어 원본이 프로젝트에 남아 같은 방향의 에셋을 다시 만들 수 있다.
- 설정 테스트는 `app.json`의 `ios.icon`, Android adaptive icon 세 역할과 스플래시 경로를 확인하고 모든 대상 파일이 실제로 존재하는지 확인한다.
- Expo prebuild가 `.icon` 폴더를 iOS 프로젝트에 복사하고 앱 아이콘 이름을 Xcode 설정에 연결한다.
- Xcode asset compiler가 `.icon`을 오류 없이 컴파일한다.
- iOS 26 Simulator에서 기본, 다크와 tinted 아이콘을 확인한다.
- Android Emulator에서 원형, 둥근 사각형, squircle과 themed icon을 확인한다.
- 밝은 화면과 어두운 화면에서 스플래시 이미지가 잘리지 않고 아이콘과 같은 상징으로 보인다.
- `bun run check`, `bun run check-types`와 `bun run test`가 통과한다.

## 가정

- Codex에 설치된 `imagegen`과 로컬 이미지 후처리 도구를 사용할 수 있다.
- 현재 개발 환경은 Expo SDK 57, Xcode 26.6과 iOS 26.5 Simulator를 제공한다.
- 이전 iOS용 아이콘은 Xcode가 `.icon`에서 생성한다. 이전 iOS Simulator가 설치되기 전까지 이전 버전의 실제 홈 화면 모습은 직접 확인하지 못한다.
- 에셋 생성은 사람이 컨셉을 고르는 대화형 작업이다. 무인 CI 생성은 요구하지 않는다.

## 이번 범위에서 제외할 기능

- App Store와 Google Play 스크린샷
- Google Play feature graphic과 광고 이미지
- 앱 화면에서 쓰는 범용 아이콘 세트와 아이콘 폰트
- SnapAI 설치, 외부 이미지 제공자 API 키 설정과 이미지 생성 CI
- 사용자가 앱 안에서 바꿀 수 있는 alternate app icon
- App Store·TestFlight 업로드와 실기기 전체 조합 검증

## 남은 위험

- `imagegen`이 만든 비트맵은 단순 기하학 상징의 가장자리를 작은 크기에서 흔들리게 할 수 있어 SVG 재작업이 필요할 수 있다.
- Icon Composer가 이전 iOS용 아이콘을 자동 생성하지만 현재 로컬 환경에는 이전 iOS Simulator가 없어 그 결과를 직접 비교하지 못한다.
- 플랫폼의 다크, tinted와 themed icon 처리 방식이 바뀌면 같은 레이어도 다르게 보일 수 있으므로 Expo SDK, Xcode 또는 Android 도구 체계를 올릴 때 다시 확인해야 한다.
