# 모바일 코드 구조

## 결정

- 모바일 코드는 Expo Router가 읽는 `apps/mobile/app`의 경로 파일과 `apps/mobile/src`의 네 영역으로 나눈다. `core`는 앱 초기화와 Provider 조립, 내비게이션, 앱 전체 테마 연결을, `features`는 사용자가 실행하는 업무 기능을, `screens`는 경로가 표시할 화면과 기능 조립을, `shared`는 여러 기능과 화면이 함께 쓰는 기반 코드와 테스트 도구를 소유한다.
- 기능 안에서는 `api`, `query`, `state`, `config`, `ui` 다섯 책임을 쓴다. 실제 코드가 있는 폴더만 만들고, `Repository`, `Service`, `Model`, `Runtime` 폴더는 만들지 않는다.
- 다섯 책임을 `apps/mobile/src` 전체에 적용하는 최상위 기술 폴더로 만들지 않는다.
- 영역 사이의 의존은 `app → core, screens, features, shared`, `core → features, shared`, `screens → features, shared`, `features → shared` 방향으로만 흐른다.
- 영역을 넘는 import는 `@/*` 별칭을 쓴다. `@/*`는 `apps/mobile/src/*`를 가리킨다. 다만 `app.config.ts`가 가져오는 모듈과 그 모듈이 다시 가져오는 파일은 예외다. Expo CLI의 설정 로더는 tsconfig 별칭을 읽지 않으므로 확장자를 붙인 상대 경로를 쓴다.
- 모바일 환경 변수의 소유권과 접근 방식은 [모바일 환경 설정](mobile-environment-configuration.md) 결정 계약을 따른다.

## 경계

- 이 결정은 기능의 목록을 고정하지 않는다. 새 업무 기능도 같은 다섯 책임을 그대로 쓴다.
- 한 기능은 다른 기능을 import하지 않는다. 여러 기능을 묶는 코드는 `screens`나 `core`가 소유한다.
- 이름이 같다는 이유만으로 여러 기능의 타입, 설정 또는 호출 코드를 하나의 공용 폴더에 모으지 않는다. 타입은 사용하는 코드 가까이에 둔다.
- `api`와 `query`는 합치지 않는다. 네트워크 호출 코드는 TanStack Query를 import하지 않고, Supabase Auth 세션은 Query 캐시에 넣지 않는다.
- 이 결정은 import 경계를 자동으로 검사하는 도구를 도입하지 않는다. 기존 TypeScript와 Ultracite 검사를 그대로 쓴다.

## 이유

전역 기술 폴더를 사용하면 하나의 제품 흐름을 이해하기 위해 저장소 여러 곳을 오가야 하고, 어느 기능이 코드를 소유하는지도 흐려진다. 업무 기능을 먼저 모으면 함께 바뀌는 코드를 가까이 둘 수 있다. 그 안에서 고정된 책임을 쓰면 의존 방향과 각 파일의 역할을 일관되게 검사할 수 있다.

## 재검토 조건

- 실제 구현에서 대부분의 기능이 같은 코드를 반복해 소유해 경계보다 중복 비용이 더 커질 때
- 선택한 다섯 책임이 모바일 런타임의 실제 의존 관계를 표현하지 못해 예외가 반복될 때
- 정해진 의존 방향을 어기는 코드가 반복되어 사람이 읽는 검사만으로는 막기 어려울 때

## 계속 제외하는 대안

- 모바일 전체를 `api`, `query`, `state`, `config`, `ui` 최상위 폴더로 나누기: 하나의 업무 흐름이 기술 분류별로 흩어지고 소유권이 흐려진다. 업무 기능보다 기술 계층별 변경이 주된 작업 단위가 되는 경우에만 다시 검토한다.
- Repository, Service 또는 별도 Domain Model 계층 도입: 지금 모바일이 다루는 외부 시스템 호출과 화면 상태에는 `api`와 `state`로 충분하고, 계층을 더하면 파일 수만 늘어난다.

## 보존할 근거

- OpenAI의 Harness Engineering은 고정된 책임을 각 business domain 안에 두고 의존 방향을 구조 검사로 강제한다.
- Feature-Sliced Design은 업무 기능별 slice 안에서 관련 코드를 가까이 두고, 최상위 계층과 slice 사이의 import 규칙을 구분한다.
