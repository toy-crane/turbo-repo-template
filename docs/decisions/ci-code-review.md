# CI 코드 리뷰

## 결정

- PR 코드 리뷰는 `.github/workflows/claude-code-review.yml`이 `anthropics/claude-code-action@v1`으로 실행한다. 리뷰 내용은 `anthropics/claude-code.git` marketplace의 `code-review` 플러그인이 정한다.
- 리뷰 프롬프트는 `--comment`를 넘긴다. 이 인수가 없으면 플러그인이 결과를 터미널에만 출력하고 PR에는 아무것도 남기지 않는다.
- `claude_args`의 `--allowedTools`에 `mcp__github_inline_comment__create_inline_comment`와 리뷰가 쓰는 `gh` 명령을 함께 적는다. 액션은 이 목록에 도구 이름이 있을 때만 해당 MCP 서버를 띄운다.
- 워크플로의 `permissions`는 읽기 권한으로 둔다. 액션이 OIDC로 교환한 GitHub App 토큰을 `GITHUB_TOKEN`과 `GH_TOKEN`으로 넘기고, 코멘트는 그 토큰으로 작성한다.

## 경계

- `/install-github-app`이 만들어주는 워크플로를 그대로 쓰지 않는다. 그 템플릿은 `--comment`와 `--allowedTools`를 넣지 않아서 리뷰가 조용히 사라진다.
- 워크플로 파일을 고치는 PR에서는 리뷰가 돌지 않는다. 액션은 워크플로 파일이 기본 브랜치의 내용과 다르면 실행을 건너뛴다. 이런 변경은 머지한 다음 PR에서 확인한다.
- 리뷰가 코멘트를 남기지 않는 것이 언제나 고장은 아니다. 플러그인은 닫힌 PR, 초안, 사소한 변경, 이미 리뷰한 PR을 건너뛴다.

## 이유

액션은 실행할 때마다 marketplace를 새로 클론한다. 플러그인이 바뀌면 저장소에서 아무것도 고치지 않아도 동작이 달라진다. 실제로 플러그인은 2026년 2월에 `--comment` 없이는 코멘트를 남기지 않도록 바꿨고, 그 뒤에 설치한 워크플로는 매 PR마다 리뷰 비용만 쓰고 결과를 버렸다. 실행은 `success`로 끝나고 액션이 출력을 가려서 겉으로는 아무 문제가 없어 보인다.

## 재검토 조건

- `/install-github-app`이 `--comment`를 포함한 워크플로를 만들어줄 때. [claude-code-action#1383](https://github.com/anthropics/claude-code-action/issues/1383)에서 추적한다.
- `code-review` 플러그인이 코멘트 게이트나 도구 목록 요구를 바꿀 때
- 리뷰를 marketplace 플러그인이 아니라 저장소 안의 명령으로 옮길 때

## 계속 제외하는 대안

- `permissions`를 쓰기 권한으로 올리기: 코멘트는 App 토큰으로 작성하므로 효과가 없고, 워크플로 토큰의 권한만 넓힌다. 액션이 App 토큰을 쓰지 않는 설정으로 옮길 때만 재검토한다.
- `show_full_output: true`를 켜두기: 리뷰 전문이 실행 로그에 남는다. 코멘트가 안 붙는 원인을 찾을 때만 잠깐 켠다.
