# CI 코드 리뷰

## 결정

- CI에서 PR 자동 코드 리뷰를 돌리지 않는다. `.github/workflows/claude-code-review.yml`을 두지 않는다.
- PR 자동 리뷰는 Codex GitHub 연동에 맡긴다.
- 푸시 전 점검은 각자 세션에서 `/code-review`로 한다.
- `@claude` 멘션에 응답하는 `.github/workflows/claude.yml`은 유지한다. 사람이 부를 때만 돌아서 비용이 예측된다.

## 경계

- `/install-github-app`이 만들어주는 `claude-code-review.yml`을 다시 설치하지 않는다.
- 이 결정은 CI 자동 리뷰만 막는다. 사람이나 에이전트가 세션에서 리뷰를 돌리는 것은 그대로 한다.

## 이유

`anthropics/claude-code-action@v1`과 marketplace `code-review` 플러그인 조합은 리뷰를 다 하고도 결과를 조용히 버린다. 실행은 success로 끝나고 액션이 출력을 가려서 겉으로는 정상으로 보인다.

원인이 둘이고 둘 다 저장소에서 못 고친다. 하나는 도구 허용 목록이다. 플러그인은 서브에이전트를 열 개 넘게 띄우는데 그 서브에이전트들도 워크플로의 `--allowedTools`를 그대로 적용받아서, 목록에 없는 `Bash(git ...)` 같은 호출이 계속 막히고 검증 단계에서 이슈가 걸러진다. 다른 하나는 플러그인이 코멘트 단계 전에 턴을 끝내 세션 결과가 비는 업스트림 버그다([claude-code-action#1087](https://github.com/anthropics/claude-code-action/issues/1087)). 허용 목록을 넓혀도 뒤엣것은 남는다.

## 재검토 조건

- [claude-code-action#1087](https://github.com/anthropics/claude-code-action/issues/1087)이 닫힐 때
- Anthropic이 운영하는 관리형 [Code Review](https://code.claude.com/docs/en/code-review) GitHub App을 쓸 수 있는 플랜으로 옮길 때. Team과 Enterprise 전용이고 리뷰 1회에 $15–25다.
- Codex 리뷰를 그만둘 때

## 계속 제외하는 대안

- 도구 허용 목록만 넓히기: 거부가 24건이나 되는 실행도 인라인 코멘트를 남겼고, 거부가 12건인 실행은 아무것도 안 남겼다. 거부 건수와 결과가 따로 논다. 목록을 넓혀도 #1087이 남는다.
- 저장소 접근 권한을 쓰기로 올리기: 코멘트는 액션이 OIDC로 교환한 App 토큰으로 쓴다. `pull-requests: read` 상태에서도 실제로 코멘트가 달린 실행이 있다.
- 플러그인 없이 워크플로에 리뷰 프롬프트를 직접 쓰기: 두 버그는 피하지만 Codex 리뷰와 하는 일이 겹친다.

## 보존할 근거

- 실행 분류(2026년 8월 12일부터 14일까지 15건, 합계 약 $37). 코멘트를 남긴 실행 6건(PR 48 두 번, 52, 55, 58, 60), 플러그인 게이트가 건너뛴 것으로 보이는 실행 4건(PR 50 첫 실행, 53, 54, 56, 3–13턴에 $0.22–0.32), 리뷰를 돌리고 아무것도 남기지 않은 실행 5건(PR 49, 50 두 번째, 51, 57, 59, 9–24턴에 약 $8).
- 실제 지적을 받은 PR은 4건이다(48, 55, 58, 60). PR 52는 "이상 없음" 요약만 받았다.
- 권한 거부 건수와 결과 사이에 상관이 없다. PR 55와 58은 거부가 24건인데도 인라인 코멘트를 남겼고, PR 57은 거부 12건에 24턴을 돌고 아무것도 안 남겼다.
- 실행 비용의 편차가 크다. PR 60 실행은 205턴에 $10.49를 썼고, 같은 날 다른 실행은 $0.22로 끝났다.
- `gh run rerun --debug`로는 가려진 SDK 출력이 열리지 않는다. 액션은 debug 모드에서도 "full output hidden for security"를 찍는다. `show_full_output: true`만 통한다.
- 액션은 워크플로 파일이 기본 브랜치와 다르면 "Workflow validation failed"로 실행을 건너뛴다. 워크플로를 고치는 PR에서는 그 변경을 검증할 수 없다.
- 액션은 PR head를 믿지 않아서 `.claude`, `CLAUDE.md`, `.mcp.json` 등을 `origin/main`에서 되돌린 뒤 리뷰한다. PR이 바꾼 지침은 리뷰에 반영되지 않는다.
