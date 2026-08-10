# 03: Markdown 본문 렌더링

## 결과

AI 답변의 텍스트 part가 스트리밍 중에도 Markdown으로 읽힌다. 문단, 제목, 강조, 인용, 목록, 링크, 인라인 코드, 코드 블록과 GFM 표를 표시하고, 링크는 인앱 브라우저 시트로 열리며, 코드 블록은 monospace 글꼴로 가로 스크롤되고 해당 코드만 복사할 수 있다. 미완성 구문은 앱을 중단시키지 않고 답변이 끝나면 최종 형태로 정리된다.

## 선행 조건

- 02: 이 작업은 02가 만든 part 렌더러 구조와 스트리밍 행 격리(다시 렌더링 제한) 위에 Markdown 표시를 얹는다.

## 완료 조건

- [x] 문단, 제목, 강조, 인용, 순서·비순서 목록, 링크, 인라인 코드, 코드 블록과 GFM 표가 렌더링된다.
- [x] 스트리밍 중에도 Markdown이 그려진다. 열린 코드 펜스나 진행 중인 표 같은 미완성 구문이 오류를 내지 않고, 답변이 끝나면 최종 형태로 정리된다.
- [x] 다시 해석은 스트리밍 중인 메시지 한 행으로 한정된다. 다른 행은 내용이 바뀔 때만 파싱한다(memo 행 + `useMemo` 파싱).
- [x] AI Markdown 본문의 텍스트도 선택할 수 있다.
- [x] 링크를 누르면 `expo-web-browser` 인앱 시트로 열린다.
- [x] 코드 블록은 시스템 monospace(`code-block.tsx` 한 곳에서만 지정)로 표시되고 가로로 스크롤되며, 해당 코드만 복사하는 버튼이 있다.
- [x] 표는 좁은 화면에서 열을 압축하는 대신 가로로 스크롤된다.
- [x] 사용자 메시지는 Markdown 없이 일반 텍스트를 유지한다.
- [x] `코드 복사` 이름이 `chatLabels`와 README 접근성 표에 같은 커밋으로 추가된다.

## 제약

- 파서는 `mdast-util-from-markdown`, `micromark-extension-gfm-table`, `mdast-util-gfm-table` 3종만 추가한다(순수 JS, 재빌드 없음). jest `transformIgnorePatterns`에 mdast·micromark 계열을 추가한다.
- 문법 강조는 넣지 않는다. monospace 사용은 모바일 타이포그래피 결정의 예외 조항을 따른다.
- 렌더러는 직접 작성한다. 참고 템플릿에서는 위치 기반 안정 키, 코드 펜스 밖 단일 줄바꿈 보존, view용·text용 스타일 분리 같은 방식만 참고하고 코드를 복사하지 않는다.
- 동적 className 문자열을 만들지 않는다. 노드 종류별 정적 클래스 매핑을 쓴다.

## 검증

- 저장소 루트에서 다음 명령이 모두 통과한다.
  - `bun run check --filter=@repo/mobile`
  - `bun run check-types --filter=@repo/mobile`
  - `bun run test --filter=@repo/mobile`
- 기기(agent-device)에서 제목, 표, 긴 코드 블록이 섞인 실제 답변을 요청해 확인한다. 스트리밍 중 스크롤이 끊기지 않고, 표·코드의 가로 스크롤이 대화 세로 스크롤을 방해하지 않으며(Android에서 특히 확인), 코드 복사 내용이 붙여넣기로 일치하고, 링크가 인앱 시트로 열린다.

## 검토 지점

없음.

## 상태

<!-- 이후 값: `in-progress`, `completed`, `blocked` -->
completed

## 실행 결과

- 검증: `bun run check`, `bun run check-types`, `bun run test`(120개) 모두 통과. 파서는 `mdast-util-from-markdown` + `micromark-extension-gfm-table` + `mdast-util-gfm-table` 3종만 추가했고, jest `transformIgnorePatterns`에 mdast·micromark 계열과 그 순수 JS 헬퍼(`decode-named-character-reference`, `character-entities`, `devlop`, `ccount`, `markdown-table` 등)를 추가했다. 타입 전용 `@types/mdast`도 devDependency로 추가했다.
- 컴포넌트 테스트 7개: 문단·제목·강조·인용·목록·인라인 코드, 코드 블록 복사(클립보드 값 일치)와 `복사됨` 피드백, GFM 표, 링크 인앱 시트 호출, 웹 주소가 아닌 링크 무시, 열린 코드 펜스 미완성 구문과 완성 후 정리, 진행 중 표.
- 기기 검증: iOS에서 제목·GFM 표(셀 안 인라인 코드 포함)·TypeScript 코드 블록·링크가 섞인 실제 답변을 스트리밍으로 확인. `코드 복사` 후 `simctl pbpaste` 값이 코드 블록 원문과 정확히 일치. 링크가 `expo-web-browser` 인앱 시트(expo.dev)로 열림. Android에서 코드 블록 내부 가로 스와이프는 코드만 밀고, 같은 영역의 세로 스와이프는 대화를 스크롤해 가로·세로 제스처가 충돌하지 않음.
- 사용자 메시지는 Markdown 없이 일반 텍스트를 유지한다(assistant 역할만 MarkdownView).
- 배운 것: 시뮬레이터에 다른 워크트리 세션이 자기 빌드를 덮어써 `ExpoWebBrowser` 네이티브 모듈 누락 오류가 났다. 이 워크트리의 DerivedData 산출물을 다시 설치해 해결했다. 동시 세션이 같은 시뮬레이터를 쓸 때 재발할 수 있다.
- 선행 조건: 02의 part 렌더러 구조와 memo 행 격리 위에 그대로 얹었다.
