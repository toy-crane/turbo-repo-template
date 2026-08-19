# Biome가 .astro frontmatter의 import와 변수를 지운다

**Symptom**: `apps/web`에서 `bun run fix`를 한 번 돌리자 `.astro` 페이지 네 장의
frontmatter가 비었다. `index.astro`, `terms.astro`, `privacy.astro`는 import가 모두
사라져 `---\n---`만 남았고, `delete-account.astro`는 `PageLayout`을 비롯해 템플릿에서만
쓰는 import가 사라졌으며, `PageLayout.astro`는 `APP_NAME`이 사라졌다.
그다음 `astro build`가 실패한다.

**Observed evidence**: Biome 2.5.6, ultracite 7.10.1, `apps/web`에서 `bun run fix`
(`ultracite fix .`) 실행. 살아남은 것은 frontmatter 스크립트에서도 쓰는 식별자뿐이었다.
`delete-account.astro`의 `APP_NAME`은 `const mailSubject = encodeURIComponent(...)`가
쓰기 때문에 남았고, 템플릿에서만 쓰는 것은 전부 지워졌다. 규칙을 하나만 끄고 다시
확인했더니 `noUnusedImports` 외에 `noUnusedVariables`도 같은 이유로 `title`,
`description`, `navigation`, `isCurrent`, `mailSubject`를 FIXABLE 오류로 보고했다.
Biome 공식 언어 지원 표는 Astro의 파싱, 포매팅, 린트를 모두 실험 단계로 표시한다.

**Suspected cause**: Biome 2.5.6이 `.astro`의 frontmatter 스크립트만 분석하고 템플릿
markup을 사용처로 세지 않는다. 그래서 "이 식별자를 쓰는가"를 묻는 규칙이 템플릿에서만
쓰는 모든 것에 아니라고 답하고, 안전한 수정으로 분류해 지운다.

**What was tried**: 루트 `biome.jsonc`에 `**/*.astro`만 대상으로 하는 `overrides`
항목을 넣어 linter, formatter, assist를 껐다. `bun run fix`를 다시 돌려 `.astro`
파일의 해시가 그대로임을 확인했다. `.astro`의 타입 검사는 `astro check`가 계속 맡는다.
처음에는 루트 `files.includes`에 `!**/*.astro`를 넣었는데, 그 방식은 `apps/mobile`의
`ultracite check .`에 `noUnnecessaryConditions` 오류 7개를 새로 만들어서 되돌렸다.
`files.includes`를 루트에 쓰면 다른 앱의 검사 결과까지 바뀐다.

**Proposed next step**: Biome의 Astro 지원이 실험 단계를 벗어났는지 확인하고, 벗어났다면
Biome를 올린 뒤 `biome.jsonc`의 `overrides` 항목을 지우고 `apps/web`에서 `bun run fix`를
돌려 `.astro` 파일이 그대로인지 다시 확인한다. 그대로면 override를 없앤 채로 둔다.
