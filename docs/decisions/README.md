# 결정 계약

## 이 색인을 쓰는 방법

계약은 영역으로 묶고, 영역 안에서는 넓은 결정부터 세부 결정 순으로 둔다. 새 계약은
해당 영역의 알맞은 자리에 넣는다.

파일 이름은 주제를 kebab-case로 적는다. `boundary`와 `boundaries`처럼 단복수가
갈리는 이름은 그 계약이 정하는 경계의 개수를 따른다. 앱과 서버 사이의 선 하나를
정하면 단수를, 여러 소유권 선을 함께 정하면 복수를 쓴다.

## 프로젝트와 작업 흐름

- [템플릿 프로젝트 정체성](template-project-identity.md) — 템플릿의 초기 설정 명령, 프로젝트 슬러그 또는 도구별 프로젝트 식별자를 변경할 때 읽는다.
- [앱 초기화 작업 흐름](app-initialization-workflow.md) — 템플릿에서 새 앱을 시작하는 대화, Skill, 스크립트의 책임을 변경할 때 읽는다.
- [디자인 시스템 생성 작업 흐름](design-system-generation-workflow.md) — 참고 자료에서 테마 후보를 만들거나 미리보기, 승인, 적용 범위를 변경할 때 읽는다.
- [Worktree 개발 세션](worktree-development-sessions.md) — 여러 Git worktree의 API·Metro 포트, 플랫폼 동시 실행, 기기 풀과 배정, 프로세스 소유권 또는 공용 Development Build 재사용 방식을 변경할 때 읽는다.
- [CI 코드 리뷰](ci-code-review.md) — CI에서 PR 자동 코드 리뷰를 켜거나, 리뷰 도구와 권한을 손대려 할 때 읽는다.
- [검토 에이전트 실행 경계](reviewer-agent-execution-boundaries.md) — Claude Code와 Codex의 전용 검토 agent, 공용 검토 계약, 읽기 전용 권한 또는 실행 맥락을 추가하거나 바꿀 때 읽는다.
- [Expo 참조 저장소 색인](expo-reference-repo-index.md) — 참조 저장소를 추가하거나 색인의 역할, 항목 형식, 커밋 고정 방식을 바꿀 때 읽는다.

## 서버

- [AI 서버 경계](ai-server-boundary.md) — AI API의 런타임, 배포 위치, 호출 주체 또는 인증 요구를 변경할 때 읽는다.
- [Hono 코드 구조](hono-code-architecture.md) — Hono 기능 경계, 라우트 조립, 폴더 구조 또는 import 경계를 변경할 때 읽는다.
- [AI 채팅 프로토콜](ai-chat-protocol.md) — AI 요청 경로, 스트리밍 응답 형식, 모바일 채팅 상태 또는 AI SDK UI message 사용 방식을 변경할 때 읽는다.
- [AI 모델 라우팅](ai-model-routing.md) — AI Gateway, 모델 제공자, 모델 식별자 또는 provider fallback 방식을 변경할 때 읽는다.
- [계정 삭제 서버 경계](account-deletion-server-boundary.md) — 계정 삭제의 사용자 인증, 관리자 권한, 서버 런타임 또는 secret key 범위를 변경할 때 읽는다.

## 데이터베이스

- [Supabase 스키마 작업 방식](supabase-schema-workflow.md) — Supabase 스키마 원본, 로컬 스택, 마이그레이션 또는 타입 생성 방식을 변경할 때 읽는다.
- [Supabase 클라이언트 경계](supabase-client-boundaries.md) — Supabase 타입, 클라이언트 초기화, 세션 저장소 또는 런타임별 키 소유권을 변경할 때 읽는다.
- [로컬 인증 제공자 설정](local-auth-provider-configuration.md) — 로컬 스택의 Google·Apple Provider 설정, client ID 보관 위치, OAuth client 구성 또는 Android 서명 등록을 변경할 때 읽는다.

## 모바일 기반

- [모바일 코드 구조](mobile-code-architecture.md) — 모바일 영역 구분, 기능 내부 책임, 폴더 구조 또는 import 경계를 변경할 때 읽는다.
- [모바일 개발 런타임](mobile-development-runtime.md) — 모바일 앱의 Expo SDK, 지원 플랫폼, Development Build 런타임 또는 배포 경계를 변경할 때 읽는다.
- [모바일 환경 설정](mobile-environment-configuration.md) — 모바일 공개 환경 변수의 필수 여부, 검증 위치, 접근 방식 또는 검증 도구를 변경할 때 읽는다.
- [모바일 Expo 의존성 호환](mobile-expo-dependency-compatibility.md) — 모바일 Expo 또는 네이티브 패키지 버전, 호환 검사와 버전 예외를 변경할 때 읽는다.
- [모바일 라우팅 타입 안전성](mobile-routing-type-safety.md) — Expo Router 경로 타입, 내부 경로 표기 또는 경로 타입 생성 검사를 변경할 때 읽는다.
- [모바일 원격 데이터 상태](mobile-remote-data.md) — 모바일에서 Supabase 원격 데이터의 조회, 캐시, 데이터 변경 또는 비동기 상태 관리를 변경할 때 읽는다.
- [모바일 테스트와 런타임 검증](mobile-testing-and-verification.md) — 모바일 테스트 계층, `agent-device`, E2E 또는 에이전트 연동 방식을 변경할 때 읽는다.

## 모바일 화면 표현

- [모바일 UI 렌더러 경계](mobile-ui-renderer-boundaries.md) — 모바일 화면의 주 렌더러, 네이티브 셸 소유권 또는 Liquid Glass 사용 범위를 선택할 때 읽는다.
- [모바일 Uniwind 스타일 경계](mobile-uniwind-styling.md) — React Native UI의 `className`, inline `style`, 런타임 값 또는 외부 컴포넌트 스타일 경계를 변경할 때 읽는다.
- [모바일 색상 시맨틱](mobile-color-semantics.md) — 모바일 색상 이름, 시맨틱 토큰, 화면 모드 또는 플랫폼별 색상 매핑을 변경할 때 읽는다.
- [모바일 타이포그래피](mobile-typography.md) — 모바일 텍스트 역할, 시스템 폰트, monospace 사용, Dynamic Type 또는 렌더러별 타이포그래피 매핑을 변경할 때 읽는다.
- [모바일 아이콘 렌더링](mobile-icon-rendering.md) — RN UI, 네이티브 셸 또는 `@expo/ui` 안에서 아이콘 렌더러와 플랫폼별 심벌을 선택할 때 읽는다.
- [모바일 작업 진행 표시](mobile-action-progress.md) — 모바일 버튼이나 자동 실행 작업의 진행 중 표시, 중복 실행 차단 또는 표시 위치를 정할 때 읽는다.
- [모바일 키보드 회피](mobile-keyboard-avoidance.md) — 키보드가 입력이나 하단 버튼을 가리는 화면을 만들거나 고칠 때 읽는다.
- [모바일 진입 키보드](mobile-keyboard-entry-focus.md) — 화면에 들어오자마자 입력을 시작하게 만들거나 고칠 때 읽는다.
- [화면 문구 한국어 말투](korean-ui-writing.md) — 앱 화면에 보이는 문구의 종결어미, 버튼과 오류 문구, 마침표를 쓰거나 고칠 때 읽는다.
- [모바일 앱 에셋 생성](mobile-app-asset-generation.md) — 앱 아이콘, Android adaptive icon, 스플래시 이미지 또는 이를 만드는 에이전트 작업을 추가하거나 바꿀 때 읽는다.
- [모바일 UI 일관성 검토](mobile-ui-consistency-review.md) — 모바일 UI 검토 에이전트의 범위, 근거, 읽기 전용 권한 또는 실행 방식을 변경할 때 읽는다.

## 모바일 기능

- [모바일 인증](mobile-authentication.md) — 모바일 로그인 제공자, 인증 세션, 계정 연결, 로그아웃 또는 로컬 인증 검증 경로를 변경할 때 읽는다.
- [모바일 프로필 식별자와 온보딩](mobile-profile-identity-and-onboarding.md) — 닉네임, 아이디, 로그인 뒤 필수 프로필 설정 또는 프로필 완성 조건을 변경할 때 읽는다.
- [모바일 설정 공개 프로필](mobile-profile-settings.md) — Settings의 프로필 표시, `프로필` 화면 진입, 사진 편집, 프로필 폼 배치 또는 계정 삭제 자리를 변경할 때 읽는다.
- [모바일 설정 폼 저장](mobile-settings-form-save.md) — 여러 값을 모아 한 번에 저장하는 설정 화면을 만들거나, 저장 컨트롤의 자리, 모양 또는 저장 가능 조건을 바꿀 때 읽는다.
- [모바일 계정 삭제](mobile-account-deletion.md) — 모바일 계정 삭제의 진입 위치, 확인, 삭제 범위, 진행 상태 또는 스토어 제출 조건을 변경할 때 읽는다.
- [모바일 AI 채팅 표현](mobile-ai-chat-rendering.md) — 모바일 AI 채팅의 Liquid Glass 입력창, 스트리밍 Markdown, 메시지 진입 또는 답변 대기 표시를 만들거나 바꿀 때 읽는다.
- [모바일 채팅 메시지 동작](mobile-chat-message-actions.md) — 채팅 메시지의 복사, 수정, 다시 받기, 중지 또는 실패 뒤 다시 시도를 만들거나 바꿀 때 읽는다.
- [모바일 채팅 스크롤](mobile-chat-scrolling.md) — 모바일 채팅의 질문 배치, 스트리밍 자동 추적, 읽던 위치 또는 최신 메시지 이동을 변경할 때 읽는다.
- [모바일 Side chat](mobile-side-chat.md) — AI 답변에서 Side chat을 시작하거나, 이어받는 문맥, 시트, 수명 또는 다시 열기 방식을 변경할 때 읽는다.
