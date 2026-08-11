---
name: initialize-app
description: Initialize or resume a new Expo app from this template by collecting a short app and visual brief, orchestrating create-design-system approval, saving docs/app-brief.md, applying verified project identity through bun run setup, and optionally handing off to create-app-assets. Use when the user explicitly asks to start, initialize, continue, or verify a new app setup. Do not use for rename-only, theme-only, asset-only, existing-app rebranding, or broad product discovery requests.
---

# Initialize App

새 앱의 설명과 시각적 방향을 대화로 정한 뒤 테마와 프로젝트 정보를 순서대로
설정한다. 새 CLI나 초기화 상태 파일을 만들지 말고 기존 Skill과 설정 명령을
이어 준다.

## 현재 상태 확인

1. `project-knowledge`를 실행한다.
2. `GLOSSARY.md`, `docs/decisions/README.md`와 다음 결정 계약을 읽는다.
   - `docs/decisions/app-initialization-workflow.md`
   - `docs/decisions/template-project-identity.md`
   - `docs/decisions/mobile-color-semantics.md`
   - `docs/decisions/mobile-typography.md`
   - `docs/decisions/mobile-ui-renderer-boundaries.md`
   - `docs/decisions/mobile-app-asset-generation.md`
   - `docs/decisions/mobile-testing-and-verification.md`
3. 다음 현재 상태를 파일에서 확인한다.
   - Git 작업 트리와 관련 파일의 사용자 변경
   - `docs/app-brief.md`
   - `apps/mobile/global.css`, 테마 브리지와 렌더러 연결
   - `scripts/setup/identity.ts`의 `IDENTITY_FIELDS`와 `isConfigured`
   - `IDENTITY_FIELDS`가 가리키는 현재 식별자 값
   - Expo 설정과 현재 활성 앱 에셋 경로
4. 저장소에서 알 수 있는 사실은 다시 묻지 않는다. 파일과 사용자의 설명이
   다르면 차이를 보여 주고 어느 쪽을 유지할지 확인한다.
5. 관련 사용자 변경을 덮어쓸 위험이 있으면 충돌하는 파일을 알리고 안전한 선택을
   받을 때까지 바꾸지 않는다.

파일은 완료한 단계를 복원하는 근거지만 과거의 사용자 승인을 증명하지는 않는다.
저장소 상태만 보고 승인 내용을 만들어 내지 않는다.

## 앱 설명 받기

다음 두 입력을 받는다.

1. 앱이 누구를 위해 어떤 일을 하는지 적은 한두 문장
2. 테마에서 드러나길 원하는 시각적 특징을 적은 한 문장

참고 이미지나 URL, 피하고 싶은 색·분위기·형태·상징은 선택 입력으로 받는다.
참고 자료가 없어도 막지 않는다. 입력이 충분하면 추가 질문 없이 테마 단계로 간다.

테마를 정하는 데 꼭 필요한 정보가 하나 빠졌을 때만 질문 하나를 한다. 답을 받으면
다음 빈칸을 확인한다. 첫 버전 범위, 사용자 흐름, 데이터 소유권, 로그인, AI, 결제,
알림, 분석과 외부 서비스를 기본 인터뷰 항목으로 묻지 않는다.

사용자가 앱의 대상과 주요 일을 전혀 정하지 못했으면 파일을 바꾸지 않고 초기화를
멈춘다. 사용자가 원할 때만 별도 `discover-opportunity` 작업을 제안한다. 이 Skill 안에서
제품 탐색 인터뷰를 시작하지 않는다.

## 테마 정하기

1. `create-design-system`을 실행하고 앱 설명, 시각적 특징과 선택 입력을 그대로 넘긴다.
2. `create-design-system`이 현재 스택과 결정 계약을 확인하고 미리보기를 만들도록 한다.
3. 참고 자료가 없으면 `create-design-system`의 글 입력 흐름에 따라 두세 방향을 먼저
   제안하고 사용자의 선택을 기다린다.
4. 후보 선택은 수정할 방향을 정한 것으로만 본다. 공식 테마 적용 승인으로 보지 않는다.
5. 사용자가 미리보기 결과를 명시적으로 적용하라고 승인할 때까지 공식 `global.css`,
   테마 브리지, 식별자와 활성 앱 에셋을 바꾸지 않는다.
6. 승인 뒤에는 테마 적용과 검증을 `create-design-system`에 맡긴다. 테마 적용과 전용
   검증이 모두 성공해야 다음 단계로 간다.

사용자가 후보를 모두 거절하거나 적용을 취소하면 활성 테마를 유지하고 초기화를
멈춘다. 테마 적용이나 검증이 실패해도 앱 요약과 식별자 단계로 넘어가지 않는다.

## 앱 요약 저장하기

승인한 테마가 적용되고 검증되면 `docs/app-brief.md`를 만들거나 갱신한다. 확정한
내용만 다음 형식으로 짧게 적는다.

```md
# 앱 요약

## 한 줄 설명

{대상과 주요 일을 포함한 한 문장}

## 시각적 방향

{승인한 테마의 핵심 특징을 적은 한두 문장}

## 피할 표현

{사용자가 확정한 제약}
```

피할 표현이 없으면 해당 섹션을 생략한다. 대화 기록, 후보 비교, 생성 이유, 토큰과
구현 방법은 넣지 않는다. 기존 앱 요약과 새 답변이 충돌하면 바꾸기 전에 차이를 보여
주고 사용자의 의도를 확인한다. 문서를 저장하지 못하면 프로젝트 정보 설정으로
넘어가지 않는다.

## 프로젝트 정보 설정하기

테마와 앱 요약이 준비된 뒤 다음 값을 하나씩 받는다.

1. 앱 표시 이름
2. 영문 소문자 kebab-case 프로젝트 슬러그
3. iOS와 Android가 함께 쓸 완성된 reverse-DNS 모바일 앱 식별자

앱 표시 이름을 바탕으로 슬러그 후보를 제안할 수 있지만 확인받은 값만 사용한다.
모바일 앱 식별자의 조직 영역은 임의로 만들지 않는다.

`scripts/setup/identity.ts`의 `IDENTITY_FIELDS`를 다시 읽고 현재 값과 바꿀 값을 모두
보여 준다. 앱 표시 이름, 프로젝트 슬러그, 모바일 앱 식별자와 변경 필드에 관해 같은
내용으로 명시적 확인을 받은 뒤에만 다음 명령을 실행한다.

```bash
bun run setup --project-slug <slug> --display-name "<name>" --mobile-app-id <id> --yes
```

각 인수를 셸에서 안전하게 전달한다. `--yes`는 바로 앞에서 똑같은 값과 변경 필드를
확인받았을 때만 사용한다. 이미 설정이 끝난 저장소에서는 현재 값과 새 값을 비교하고
사용자가 재설정을 명시적으로 요청했을 때만 `--force`를 추가한다. 이름만 다르게
보인다는 이유로 `--force`를 임의로 사용하지 않는다.

명령이 취소되거나 실패하면 테마와 `docs/app-brief.md`를 그대로 두고 실패한 입력과
명령을 알린다. 기본 초기화를 완료했다고 보고하지 않는다.

## 기본 초기화 검증하기

`bun run setup`이 성공하면 `IDENTITY_FIELDS`를 기준으로 실제 파일을 다시 읽어 다음
값을 확인한다.

- 루트 `package.json`의 `name`
- Expo `name`, `slug`와 `scheme`
- iOS `bundleIdentifier`
- Android `package`
- Supabase `project_id`
- `docs/app-brief.md`의 한 줄 설명과 시각적 방향

확정한 입력과 모든 값이 일치하고 `create-design-system`의 테마 검증이 통과한 경우에만
기본 초기화 완료를 보고한다. 불일치가 있으면 파일과 현재 값을 구체적으로 알리고
완료로 처리하지 않는다.

## 앱 에셋 선택 받기

기본 초기화가 완료된 뒤 한 번만 묻는다.

```text
앱 아이콘과 스플래시도 지금 이어서 만들까요?
```

사용자가 동의하면 그 답을 `create-app-assets`를 시작하는 명시적 요청으로 보고 해당
Skill을 실행한다. 같은 대화에서 앱의 한 줄 설명, 승인한 시각적 방향, 참고 자료와
피할 표현을 넘긴다.
`create-app-assets`가 요구하는 시안 선택과 최종 적용 승인은 따로 받도록 한다. 에셋을
이어 만들겠다는 답을 시안 선택이나 활성 에셋 교체 승인으로 보지 않는다.

사용자가 건너뛰면 다시 권하지 않고 기본 초기화 완료 상태로 끝낸다. 에셋 생성이
실패하거나 중단돼도 기본 초기화 완료 상태는 유지하고 에셋 작업의 현재 상태만 따로
알린다.

## 중단한 작업 이어가기

별도 세션 파일을 만들지 말고 현재 파일에서 진행 지점을 찾는다.

- 테마와 `docs/app-brief.md`가 준비됐지만 식별자가 템플릿 기본값이면 프로젝트 정보
  설정부터 이어간다.
- 식별자는 설정됐지만 테마 승인 내용을 확인할 수 없으면 현재 테마를 유지할지 다시
  만들지 한 가지만 확인한다.
- 테마, 앱 요약과 식별자가 모두 일치하면 기본 초기화가 이미 끝났다고 보고하고 파일을
  다시 바꾸지 않는다.
- 일부 값만 설정됐으면 현재 값과 빠진 값을 보여 주고 완료하지 않은 단계만 이어간다.
- 이미 완료한 테마나 식별자를 다시 적용하지 않는다. 재설정 요청이 없으면 `--force`를
  사용하지 않는다.

새 변경을 적용해야 하는데 과거 승인을 파일에서 확인할 수 없을 때만 사용자의 의도를
다시 확인한다.

## 범위 지키기

- 새 CLI, 대화형 터미널 UI, 모델 연결, 인증, 텔레메트리와 세션 상태 파일을 만들지 않는다.
- 제품 기능, 화면, 데이터, 로그인, AI, 결제, 알림, 분석과 외부 서비스를 만들거나
  설정하지 않는다.
- 테마 규칙, 식별자 치환 규칙과 앱 에셋 생성 규칙을 이 Skill에 다시 구현하지 않는다.
- App Store·Google Play 스크린샷, feature graphic과 배포를 포함하지 않는다.
- 관련 사용자 변경을 되돌리거나 덮어쓰지 않는다.

## 완료 보고하기

기본 초기화와 선택형 앱 에셋의 상태를 나눠 보고한다. 다음 내용을 포함한다.

- 승인해 적용한 테마 방향과 전용 검증 결과
- 저장한 `docs/app-brief.md`
- 적용하고 실제 파일에서 확인한 프로젝트 정보
- 앱 에셋을 건너뛰었는지, 진행 중인지, 완료했는지
- 실패한 단계, 보존한 중간 결과와 사용자가 결정해야 할 내용

기본 초기화 완료는 승인한 테마 적용, 앱 요약 저장, `bun run setup` 성공과 실제 식별자
검증을 모두 통과했을 때만 선언한다.
