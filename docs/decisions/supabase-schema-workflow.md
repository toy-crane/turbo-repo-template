# Supabase 스키마 작업 방식

## 결정

- Supabase 개발은 local-first로 진행하며 로컬 Supabase stack을 개발 기준 환경으로 사용한다.
- `supabase/schemas/`의 declarative schema 파일을 데이터베이스 구조의 source of truth로 사용한다.
- 일반적인 구조 변경 migration은 declarative schema를 수정한 뒤 `supabase db diff -f <name>`으로 생성한다.
- 생성된 migration은 초안으로 취급해 의도하지 않은 파괴적 변경, 권한과 RLS, diff 미지원 객체 및 실행 순서를 리뷰하고 필요한 예외만 수동으로 보완한다.
- 전체 migration은 `supabase db reset`으로 처음부터 재생해 검증한 뒤 로컬 스키마에서 TypeScript 타입을 다시 생성한다. schema, migration과 생성 타입은 같은 변경 단위로 커밋한다.
- 모바일과 향후 서버가 공유하는 TypeScript 데이터베이스 타입은 로컬 스키마에서 생성한다.
- 일반 CI에서는 매 실행마다 로컬 Supabase stack을 생성하거나 `supabase db reset`을 실행하지 않는다.

## 경계

- Dashboard, SQL Editor 또는 로컬 Studio에서 직접 수행한 구조 변경을 정상적인 스키마 변경 경로로 취급하지 않는다. 동일한 의도는 declarative schema 파일에 먼저 반영해야 한다.
- 원격 Supabase 프로젝트는 로컬에서 검증한 변경을 배포하는 대상이며 스키마 원본이 아니다.
- 일반적인 구조 변경을 위해 빈 imperative migration부터 직접 작성하지 않는다. DML과 declarative diff가 표현하지 못하는 객체만 생성 migration에 수동으로 보완하거나 별도 versioned migration으로 관리한다.
- 이미 원격 환경에 적용된 migration은 수정하지 않고 앞으로 진행하는 새 migration으로 변경한다.
- migration 안에 임의의 `COMMIT` 또는 `BEGIN`을 삽입하지 않는다.
- migration 재생과 데이터베이스 테스트는 schema 또는 migration을 변경한 개발자가 로컬에서 수행한다. 향후 DB 전용 수동 또는 경로 기반 CI 검증이 필요하면 별도로 결정한다.

## 이유

Declarative schema는 현재 원하는 데이터베이스 상태를 한곳에서 읽을 수 있게 하고, local-first workflow는 스키마와 생성 타입을 원격 Dashboard 상태에 의존하지 않고 재현하게 한다. 저장소가 스키마 원본을 소유하면 모바일과 향후 서버가 같은 계약에서 타입을 생성할 수 있고 원격 환경의 수동 변경으로 생기는 drift를 줄일 수 있다. 모든 CI 실행에서 Docker 기반 로컬 stack을 다시 만드는 비용은 데이터베이스와 무관한 변경에도 발생하므로 기본 검증 경로에 포함하지 않는다.

## 재검토 조건

- Supabase의 declarative diff가 프로젝트에서 필요한 데이터베이스 객체를 안정적으로 표현하지 못할 때
- 로컬 Supabase stack을 팀의 기본 개발 환경에서 지속적으로 실행할 수 없을 때
- 프로젝트가 외부에서 관리되는 데이터베이스 스키마를 소비만 하게 될 때

## 계속 제외하는 대안

- Dashboard-first로 스키마를 관리 — 원격 상태가 Git의 schema 및 migration과 달라질 수 있다. 외부 관리 데이터베이스를 읽기 전용으로 소비할 때만 재검토한다.
- imperative migration만을 source of truth로 사용 — 현재 스키마를 이해하려면 누적 migration 전체를 재생하거나 추적해야 한다. declarative diff의 한계가 프로젝트의 주요 객체를 막을 때 재검토한다.
