# Supabase 클라이언트 경계

## 결정

- `@repo/supabase`를 모바일과 향후 서버가 함께 사용하는 내부 패키지로 둔다.
- 공유 패키지는 Supabase 스키마에서 생성한 TypeScript 타입만 소유하는 types-only package로 시작한다.
- 모바일 앱은 `createClient<Database>`로 singleton client를 직접 만들고, `@supabase/supabase-js`, React Native URL polyfill, Expo SQLite 기반 `localStorage`, `EXPO_PUBLIC_SUPABASE_URL`과 `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 소유한다.
- 향후 서버는 같은 스키마 타입을 사용하되, 서버 런타임의 환경 변수와 권한에 맞는 별도 client를 초기화한다.

## 경계

- 공유 패키지는 Supabase runtime SDK, Expo 또는 서버 전용 storage를 의존성으로 갖거나 환경 변수를 직접 읽지 않는다.
- 공유 패키지와 모바일 앱에는 `service_role` 또는 secret key를 포함하지 않는다.
- 이 결정은 client와 타입의 소유권만 정한다. 인증 화면과 세션 생명주기, 서버의 사용자 권한 전달 방식과 관리자 권한 사용 범위는 별도로 결정한다.

## 이유

스키마에서 생성한 타입은 동일한 Supabase API 계약을 표현하므로 모바일과 서버가 공유해야 한다. 반면 runtime SDK, session storage, 환경 변수와 비밀 키는 실제로 client를 생성하는 소비자가 소유해야 한다. types-only package로 시작하면 스키마 계약 중복을 막으면서 아직 존재하지 않는 서버를 위해 factory 추상화를 미리 만들지 않는다.

## 재검토 조건

- Supabase가 모바일과 서버의 storage 및 인증 문맥을 안전하게 추상화하는 공식 범용 adapter를 제공할 때
- 모바일과 서버가 서로 다른 Supabase 프로젝트나 호환되지 않는 스키마를 사용하게 될 때
- 서버 추가 계획이 폐기되어 Supabase의 소비자가 모바일 앱 하나로 영구히 한정될 때
- 둘 이상의 런타임에서 안전하게 공유해야 하는 실질적인 client 생성 로직이 반복될 때

## 계속 제외하는 대안

- typed client factory를 공유 패키지에 미리 추가 — 현재는 `createClient<Database>` 한 줄만 감싸며 아직 없는 서버를 위한 추상화가 된다. 둘 이상의 런타임에서 공유할 실질적인 초기화 규칙이 생길 때 재검토한다.
- 완성된 singleton client를 공유 패키지에서 export — Expo storage와 공개 환경 변수 또는 서버 비밀 키가 하나의 초기화 경로에 섞인다. 모든 소비자가 같은 런타임과 권한 문맥을 갖게 될 때만 재검토한다.
- Supabase 타입과 client를 모바일 앱에만 배치 — 향후 서버가 같은 스키마 계약을 중복 생성하고 관리하게 된다. 서버 추가 계획이 폐기될 때만 재검토한다.
