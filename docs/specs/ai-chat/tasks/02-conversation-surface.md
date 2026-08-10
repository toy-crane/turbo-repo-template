# 02: 대화 화면 기반 재구축

## 결과

iOS와 Android Development Build에서 사용자는 재구축된 대화 화면을 사용한다. 빈 대화에는 제목과 짧은 안내만 보이고, 여러 줄 입력창이 키보드와 Safe Area 위에 머물며 정해진 최대 높이까지 늘어난다. 생성 중에는 전송 버튼이 생성 중지 버튼으로 바뀌고, 중지하면 그때까지 받은 답변이 남는다. 메시지 목록은 가상 목록으로 part를 종류와 순서대로 그리고(이번 작업에서 텍스트 part는 일반 텍스트, 나머지는 안전한 기본 표시), 사용자가 아래 근처를 볼 때만 따라가며, 멀어지면 최신 메시지로 이동 버튼이 보인다. 이후 작업이 쓸 새 의존성 전부와 네이티브 재빌드 1회, 공용 `Icon` 컴포넌트도 이 작업에 포함된다.

## 선행 조건

- 01: 중지의 서버 절반(abort 전파와 중단 로그)이 있어야 이 작업의 기기 검증에서 "모바일 중지 → 서버 모델 호출 중지"를 확인할 수 있다.

## 완료 조건

- [ ] 새 의존성을 설치하고 iOS·Android Development Build를 각 1회 재빌드한다. `@legendapp/list` v3, `react-native-keyboard-controller`는 최신 호환 버전, `expo-symbols`·`expo-clipboard`·`expo-web-browser`는 `bunx expo install`로 SDK 호환 버전을 쓴다. 이후 작업(03, 05)이 쓸 clipboard·web-browser도 재빌드를 한 번으로 묶기 위해 여기서 설치한다.
- [ ] 루트 레이아웃에 `KeyboardProvider`가 들어가고, jest 설정이 갱신된다(`transformIgnorePatterns`에 `@legendapp`, `jest.setup.ts`에 `react-native-keyboard-controller/jest` 공식 목).
- [ ] 공용 `Icon` 컴포넌트(`src/shared/ui/icon/`)가 아이콘 결정을 구현한다. iOS는 `SymbolView`, Android는 `material-paths.ts`의 Material Symbols path 데이터를 `react-native-svg`로 그리고 Apache-2.0 출처 표기를 같은 파일에 둔다.
- [ ] 대화가 비어 있으면 제목과 짧은 안내만 보인다. 추천 질문은 없다.
- [ ] 입력창이 여러 줄로 늘어나 정해진 최대 높이에서 멈춘다. 공백뿐인 메시지는 전송되지 않고, 연속 탭 중복 전송은 기존 `running` ref 가드가 계속 막는다.
- [ ] 전송을 시작하면 입력을 비우고 사용자 메시지를 바로 표시한다. 키보드는 목록에서 끌어내려 닫을 수 있다.
- [ ] `submitted`와 `streaming` 동안 전송 버튼이 생성 중지 버튼으로 바뀌고, 중지하면 부분 답변을 남긴 채 입력 가능한 상태로 돌아온다.
- [ ] 메시지 목록이 가상 목록으로 바뀌고 `message.parts`를 종류·순서대로 그린다. 텍스트 part는 선택 가능한 일반 텍스트, 미지원 part는 앱을 중단시키지 않는 기본 표시다. 문자열로 합치던 `messageText`는 삭제한다.
- [ ] 사용자가 아래 근처를 볼 때만 새 메시지와 스트리밍을 따라가고, 이전 내용을 읽는 중에는 화면을 강제로 옮기지 않으며, 아래에서 멀어지면 최신 메시지로 이동 버튼이 보이고 동작한다.
- [ ] 스트리밍 중 다른 메시지 행이 다시 렌더링되지 않는 것을 렌더 횟수 카운터 테스트로 확인한다(`useChat`의 `throttle` + memo 행. 참조가 유지되지 않으면 커스텀 비교 함수로 대응).
- [ ] `chatLabels`가 `ui/chat-labels.ts`로 옮겨지고(기존 import 경로 재수출 유지) `생성 중지`, `최신 메시지로 이동` 이름이 `chatLabels`와 README 접근성 표에 같은 커밋으로 추가된다.
- [ ] 기존 채팅 컴포넌트 테스트의 6개 동작(전송·스트리밍, 실패 후 다시 시도, 재요청, 토큰 상실, 토큰 없음, 중복 탭)이 새 구조에서도 통과하고, 중지·빈 대화·공백 차단·버튼 전환 테스트가 추가된다.
- [ ] `HomeScreen`이 `useChatSession`을 소유하고 `ChatPanel`에 세션 객체를 넘긴다. 인증에서 access token을 받아 채팅에 넘기는 경계는 `HomeScreen` 안에 그대로 남는다.

## 제약

- `@legendapp/list`는 v3 의미로 구성한다(`maintainScrollAtEnd`와 임계값, `/keyboard`·`/reanimated` 하위 경로). 참고 템플릿의 v2 prop을 복사하지 않는다.
- 참고 템플릿 `chat-template`은 라이선스가 없다. 설계 방식만 참고하고 코드를 복사하지 않는다.
- 채팅 본문은 React Native UI와 heroui-native만 사용한다. 색상은 시맨틱 클래스만, `fontFamily` 지정과 글자 확대 제한은 금지.
- 가상 목록이 jest 환경에서 행을 그리는지 이 작업의 첫 시간에 확인한다. 그리지 않으면 `estimatedListSize` 지정 → 테스트 하네스에서 `onLayout` 발화 → 테스트 전용 목(데이터를 그대로 매핑) 순으로 대응한다. 테스트의 목적은 가상화가 아니라 내용과 동작 확인이다.
- `HomeScreen` 내부에서 `Stack.Toolbar`가 헤더에 등록되는지 1분 프로브로 확인하고 결과를 실행 결과에 남긴다. 등록되지 않으면 작업 05는 라우트 파일이 조립을 맡는 대안을 쓴다.

## 검증

- 저장소 루트에서 다음 명령이 모두 통과한다.
  - `bun run check --filter=@repo/mobile`
  - `bun run check-types --filter=@repo/mobile`
  - `bun run test --filter=@repo/mobile`
- `apps/mobile`에서 `bun run ios`와 `bun run android`로 재빌드해 설치한다. `agent-device` 한 세션(플랫폼별)에서 로컬 이메일 코드 로그인 뒤: 여러 줄 메시지 전송, 스트리밍 확인, 생성 중지 시 부분 답변 유지와 API 개발 서버의 중단 로그 출력, 위로 스크롤 중 강제 이동 없음과 최신 메시지로 이동 버튼 동작, 키보드 끌어내려 닫기, 큰 글자·다크 모드·고대비·모션 줄이기 확인.
- iOS Large Title 아래 목록 상단 inset과 따라가기 중 제목 축소 동작을 확인한다. iOS 스트리밍이 토큰 단위로 도착하는지 확인하고, 버퍼링이 보이면 그때만 스트리밍 헤더 추가를 검토한다.

## 검토 지점

이 작업 완료 후 사용자 검토가 필요하다. 누적 범위: 새 의존성 5종과 네이티브 재빌드, 가상 목록·키보드·입력창 상호작용, `ChatSession` 확장 형태, 세션 소유를 `HomeScreen`으로 옮긴 구조. 이 기반의 오류는 03·04·05 전체로 이어져 되돌리는 비용이 커진다.

## 상태

<!-- 이후 값: `in-progress`, `completed`, `blocked` -->
pending

## 실행 결과

- 검증: —
- 선행 조건: —
