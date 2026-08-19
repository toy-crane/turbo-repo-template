# bun run setup이 apps/web의 앱 이름을 바꾸지 않는다

**Symptom**: `bun run setup`으로 앱 표시 이름을 바꾸면 `apps/mobile/app.json`의
`expo.name`만 바뀌고 `apps/web`이 페이지에 보여 주는 앱 이름은 템플릿 기본값으로 남는다.
그 결과 웹 페이지가 스토어 등록 정보와 다른 이름을 말하게 된다.

**Observed evidence**: `scripts/setup/identity.ts`가 바꾸는 대상 목록에 `apps/web`이
없다. 표시 이름은 `file: "apps/mobile/app.json"`, `path: ["expo", "name"]`,
`source: "displayName"` 항목 하나로만 적용된다. `apps/web/src/config/site.ts`의
`APP_NAME`은 별도 사본이다.

**Suspected cause**: `apps/web`은 [템플릿 프로젝트 정체성](../decisions/template-project-identity.md)
계약을 쓸 때 없던 앱이다. 계약이 정한 적용 대상은 루트 `package.json`의 `name`, Expo의
`slug`와 `scheme`, Supabase `config.toml`의 `project_id`, 그리고 표시 이름과 모바일 앱
식별자다.

**What was tried**: `apps/web/src/config/site.test.ts`에 `APP_NAME`이
`apps/mobile/app.json`의 `expo.name`과 다르면 실패하는 테스트를 넣었다. 이 파일은
`@repo/web` 패키지 바깥이라 turbo 작업 해시에 들어가지 않는다. 처음에는 캐시된 통과가
드리프트를 가려서, `turbo.json`에 `@repo/web#test`를 `cache: false`로 두어 매번 돌게
했다. 이름이 갈리면 `bun run test`가 실패하지만, 자동으로 맞춰 주지는 않는다.

**Proposed next step**: `apps/web`을 표시 이름 적용 대상에 넣을지 정한다. 넣기로 하면
[템플릿 프로젝트 정체성](../decisions/template-project-identity.md) 계약의 적용 대상
목록을 먼저 고치고, `scripts/setup/identity.ts`에 항목을 더한 뒤
`scripts/setup/fixture.ts`와 `setup.test.ts`를 함께 갱신한다.
