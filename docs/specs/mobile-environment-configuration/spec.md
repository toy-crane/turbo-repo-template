# 모바일 환경 설정

## 목표

모바일 앱에 필요한 모든 공개 환경 설정을 실행과 빌드 전에 한 계약으로 검증한다. 부분적으로만 설정된 앱을 정상 실행으로 취급하지 않는다.

## 필수 환경 설정

`apps/mobile/.env.example`에 선언한 다음 값은 모두 필수다.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

빈 문자열과 공백만 있는 문자열은 누락으로 처리한다. URL은 HTTP 또는 HTTPS 주소여야 한다. Google client ID는 Google OAuth client ID 형식이어야 한다.

## 환경 설정 계약

- `apps/mobile/env.ts`가 모든 필수 이름과 형식을 하나의 Zod 스키마로 소유한다.
- 원시 값은 Expo가 번들에 포함할 수 있도록 각 `process.env.EXPO_PUBLIC_...` 이름을 점 표기법으로 직접 읽는다.
- 앱 코드는 검증된 환경 설정을 가져와 사용한다. 기능 파일은 `process.env`를 직접 읽거나 같은 누락 검사를 반복하지 않는다.
- `@t3-oss/env-core`는 사용하지 않는다.

## 실패 동작

- 하나 이상의 값이 누락되거나 유효하지 않으면 오류는 해당 변수 이름과 실패 이유를 모두 알려야 한다.
- Expo가 앱 설정을 읽는 단계에서 전체 계약을 확인한다.
- 검증이 실패하면 개발 서버, 네이티브 실행, prebuild와 export가 결과물을 만들기 전에 종료한다.
- Google 플러그인이나 앱 기능은 누락된 값을 이유로 조용히 빠지거나 비활성화되지 않는다.

## 파일과 비밀값 경계

- 실제 로컬 값은 Git에서 제외한 `apps/mobile/.env.local`에 둔다.
- `apps/mobile/.env.example`에는 필수 이름과 공개값이라는 설명만 둔다.
- `EXPO_PUBLIC_` 값은 앱 번들에서 공개된다는 경고를 유지한다.
- 서버 비밀값, Google client secret, Supabase secret key와 빌드 작업 전용 토큰은 이 계약에 넣지 않는다.

## 검증

- 모든 값이 올바르면 환경 설정 계약이 타입이 지정된 값을 반환한다.
- 필수값마다 누락, 빈 문자열과 공백 입력을 거부한다.
- URL과 Google client ID의 잘못된 형식을 거부한다.
- 오류는 한 번의 검사에서 발견한 모든 문제를 보여준다.
- 테스트는 개발자의 `apps/mobile/.env.local`을 읽지 않고 고정된 테스트 값으로 같은 계약을 확인한다.

## 제외 범위

- EAS Build와 EAS Update 환경별 값 관리
- 서버와 빌드 작업의 비밀값 검증
- `.env.local` 자동 생성과 로컬·원격 값 자동 전환

## 남은 위험

- Expo 설정 로더와 Jest의 실행 순서가 다르므로 테스트 값을 주입하는 시점이 실제 앱의 조기 실패 동작을 약하게 만들지 않아야 한다.
