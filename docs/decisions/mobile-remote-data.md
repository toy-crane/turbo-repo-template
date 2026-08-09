# 모바일 원격 데이터 상태

## 결정

- 모바일 앱은 Supabase에서 조회하고 변경하는 원격 데이터의 비동기 상태와 cache를 TanStack Query로 관리한다.
- Supabase client는 네트워크 요청과 typed API를 담당하고, TanStack Query는 query key, loading과 error, stale 상태, retry, refetch 및 mutation 이후 invalidation을 담당한다.

## 경계

- Supabase 인증 session은 TanStack Query cache에 저장하지 않는다.
- 화면의 일시적인 입력, 모달 열림 여부와 같은 로컬 UI 상태를 TanStack Query로 관리하지 않는다.
- query와 mutation을 공유 Supabase types-only package에 넣지 않고 실제 데이터를 소비하는 앱 영역에 둔다.

## 이유

Supabase client만 사용하면 화면마다 loading, error, 중복 요청, 재조회와 mutation 이후 동기화를 직접 구현해야 한다. TanStack Query를 원격 상태 계층으로 사용하면 Supabase의 typed query를 유지하면서 이 생명주기를 일관되게 관리할 수 있다.

## 재검토 조건

- 모바일 앱이 원격 데이터를 반복 조회하거나 변경하지 않는 단순한 구조로 축소될 때
- Supabase가 앱의 요구를 충족하는 공식 원격 상태 cache 계층을 제공할 때
- 주 데이터 경로가 서버 원격 상태가 아니라 완전한 offline-first 동기화 데이터베이스로 바뀔 때

## 계속 제외하는 대안

- Supabase 요청 상태를 화면별 `useEffect`와 `useState`로 관리: 중복 요청, cache와 invalidation 규칙이 화면마다 분산된다. 원격 데이터 화면이 한두 개로 영구히 제한될 때만 재검토한다.
