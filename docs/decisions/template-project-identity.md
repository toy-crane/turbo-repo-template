# 템플릿 프로젝트 정체성

## 결정

- 템플릿 사용자는 처음 한 번 루트의 `bun run setup`을 실행해 프로젝트 정체성을 설정한다.
- setup은 lowercase kebab-case의 단일 `project slug`를 받아 루트 `package.json`의 `name`, Expo의 `slug`와 `scheme`, Supabase `config.toml`의 `project_id`에 적용한다.
- 대화형 setup은 `project slug`, 앱 표시 이름, 완성된 reverse-DNS 모바일 앱 식별자를 한 단계씩 입력받는다. 모바일 앱 식별자는 iOS `bundleIdentifier`와 Android `package`에 동일하게 적용한다.
- setup은 적용 전에 변경될 필드를 모두 미리 보여주고 사용자의 확인을 받은 뒤 수정한다.
- setup은 대화형 입력과 `--project-slug`, `--display-name`, `--mobile-app-id`, `--yes`를 사용하는 비대화형 실행을 모두 지원한다.
- 이미 설정이 끝난 저장소에서는 현재 값을 보여주고 변경 없이 종료한다. 다시 설정하는 작업은 명시적인 override 없이는 수행하지 않는다.

## 경계

- Supabase local database의 실제 PostgreSQL database 이름인 `postgres`는 변경하지 않는다. `project_id`는 같은 머신의 local stack을 구분하는 프로젝트 식별자다.
- setup은 Supabase local stack을 시작, 중지, 초기화 또는 삭제하지 않는다.
- setup은 모바일의 Supabase URL이나 publishable key를 수집하거나 env 파일을 생성하지 않는다.
- 원격 Supabase project ref 연결은 별도 작업이며 local `project_id`에서 생성하거나 같은 값으로 강제하지 않는다.
- 알려진 설정 필드만 변경하고 저장소 전체의 동일 문자열을 일괄 치환하지 않는다.

## 이유

템플릿의 도구별 식별자가 기본 이름으로 남으면 패키지 로그, Expo deep link와 로컬 Supabase stack 이름이 서로 다른 프로젝트를 가리키게 된다. 하나의 slug를 공통 입력으로 사용하면 최초 설정은 단순해지면서도 실제 database 이름이나 원격 project처럼 독립적인 식별자를 잘못 묶지 않는다.

## 재검토 조건

- Expo 또는 Supabase가 템플릿 전체의 프로젝트 식별자를 안전하게 초기화하는 공식 통합 command를 제공할 때
- 템플릿에서 Expo 앱이나 Supabase local stack이 제거될 때

## 계속 제외하는 대안

- Supabase만 초기화하는 `setup:supabase` — root package와 Expo 식별자가 템플릿 기본값으로 남는다. 프로젝트별 도구 설정을 완전히 독립적으로 운영해야 할 때만 재검토한다.
- 저장소 전체 문자열 치환 — 문서, 생성물 또는 우연히 같은 문자열을 가진 데이터까지 변경할 수 있다. 치환 대상이 기계적으로 생성된 전용 템플릿 저장소일 때만 재검토한다.
- 사용자마다 `supabase init` 실행 — 템플릿이 소유하는 declarative schema와 local config를 덮어쓰거나 버전별 기본값 차이를 만든다. 템플릿이 Supabase config를 더 이상 제공하지 않을 때만 재검토한다.
