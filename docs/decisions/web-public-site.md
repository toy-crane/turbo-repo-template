# 공개 웹 사이트

## 결정

- 앱 밖에서 누구나 열 수 있어야 하는 페이지는 `apps/web`이 소유한다. 이용약관,
  개인정보처리방침, 지원 안내와 랜딩 페이지가 여기에 해당한다.
- `apps/web`은 Astro로 만들고 정적 출력을 기본으로 삼는다. 모바일 앱과 `apps/api`와
  다른 Vercel 프로젝트에 배포한다.
- 법률 문서의 본문은 `apps/web` 안의 Markdown 원문에 두고 페이지가 그 원문을 읽어
  그린다. 개정 이력은 Git 이력으로 남긴다.
- 스토어 심사에 넣는 공개 주소는 모두 이 사이트의 주소를 쓴다. 앱 안에서도 같은
  주소를 연다. 같은 문서를 앱과 웹에 각각 두지 않는다.
- 폼처럼 서버가 필요한 동작은 `apps/web`이 직접 처리하지 않고 `apps/api`의 Hono로
  보낸다.
- Astro 작업을 시작할 때 공식 문서는 Astro Docs MCP 서버에서 읽는다. 이름은
  `astro-docs`, 주소는 `https://mcp.docs.astro.build/mcp`, transport는 `http`다.
  Astro는 `llms.txt`를 제공하지 않으므로 `.agents/context`에 사본을 두지 않는다.
- 템플릿은 사이트 구조, 공용 레이아웃과 법률 문서 초안까지 제공한다. 초안의 내용은
  템플릿이 실제로 가진 기능 구성을 기준으로 쓴다. 이메일·Google·Apple 로그인, 프로필,
  프로필 사진, AI 채팅, Supabase와 Vercel이 그 기준이다.
- 프로젝트마다 달라지는 값은 `{{운영 주체}}`처럼 이중 중괄호 자리표시자로 남긴다.
  파생 프로젝트는 이 자리표시자를 채워서 자기 문서를 만든다. 남은 자리표시자는
  `grep -rn '{{' apps/web`으로 한 번에 찾을 수 있어야 한다.
- 자리표시자가 하나라도 남아 있으면 스토어에 제출하지 않는다. 템플릿 초안을 그대로
  올리는 것은 완료가 아니다.

## 경계

- 이 결정은 로그인 없이 열리는 공개 문서와 마케팅 페이지만 다룬다. 로그인하는 웹
  화면, 웹 대시보드와 앱 기능의 웹 버전은 포함하지 않는다.
- `apps/web`은 Supabase secret key와 모델 제공자 비밀 값을 갖지 않는다.
- 랜딩 페이지의 홍보 내용은 이 결정이 정하지 않는다. 제품 정의가 나온 뒤에 쓴다.
- 법률 문서의 문장은 [화면 문구 한국어 말투](korean-ui-writing.md)가 다루지 않는다.
  그 계약이 공개 규칙에서 답을 찾지 못하는 법률 문구는 따로 판단한다고 이미 정해
  두었다. 앱 안 설정 행의 이름은 그 계약을 따른다.
- Expo Web은 후보가 아니다. [모바일 개발 런타임](mobile-development-runtime.md)이
  개발하지 않기로 정했다.
- `apps/web`의 개발 서버는 `bun run dev`가 관리하지 않는다.
  [Worktree 개발 세션](worktree-development-sessions.md)은 API와 Metro 두 프로세스만
  소유하며, 공개 사이트는 로컬 API, Metro, Supabase 어느 것에도 의존하지 않는다.
- `bun run setup`은 법률 문서의 자리표시자를 채우지 않는다.
  [템플릿 프로젝트 정체성](template-project-identity.md)이 알려진 설정 필드만 바꾸고
  저장소 전체 문자열을 일괄 치환하지 않기로 정했으며, 사업자등록번호와 개인정보
  보호책임자 연락처는 그 필드가 아니다.
- 템플릿은 Vercel 프로젝트를 미리 만들어 두지 않는다. 파생 프로젝트가 자기 Vercel
  프로젝트를 연결하고 주소를 얻는다.
- 법률 문서의 내용이 맞는지는 이 계약이 보장하지 않는다. 템플릿 초안은 스토어와 법령이
  요구하는 항목의 자리를 채운 출발점이며 법률 검토를 대신하지 않는다.

## 이유

Apple과 Google이 모두 개인정보처리방침을 공개 주소로 요구하고, 같은 문서를 앱
안에서도 닿게 하라고 요구한다. 앱 안에 본문만 넣으면 스토어 메타데이터에 넣을 주소가
없고, 주소만 만들면 앱 안 링크 요구를 못 채운다. 공개 사이트 하나를 두고 앱이 그
주소를 열면 한 문서로 두 요구를 함께 채우고, 문서를 고칠 때 앱을 다시 심사받지 않는다.

`apps/api`에 HTML 경로를 더하면 배포 단위는 늘지 않지만 AI 요청을 담당하는 서버가
마케팅과 법률 문서까지 소유하게 되어 두 성격의 배포 주기가 묶인다. 별도 Vercel
프로젝트로 나누면 랜딩 페이지를 고칠 때 AI API를 다시 배포하지 않는다.

Astro는 스스로를 콘텐츠 중심 사이트를 위한 프레임워크로 소개하며 블로그, 마케팅,
전자상거래를 그 예로 든다. 기본 출력에 JavaScript를 넣지 않는다. 이 사이트가 담는
것은 법률 문서와 랜딩 페이지, 곧 읽는 문서다. Next.js는 라우터와 hydration만으로도
번들을 실어 보내는데 지금 사이트에는 그 비용을 낼 이유가 없다. 상호작용이 필요한
자리에는 컴포넌트를 섬처럼 끼우고, 서버가 필요하면 `apps/api`로 보낸다.

Markdown 원문을 두면 법률 문서 개정이 Git diff로 읽힌다. 개인정보보호법 제30조가
처리방침을 정보주체가 쉽게 확인하도록 공개하라고 요구하므로, 무엇이 언제 어떻게
바뀌었는지 남는 형태가 필요하다.

이 저장소는 템플릿이라 여기서 만든 문서를 파생 프로젝트가 그대로 물려받는다. 그래서
빈 골격만 주지 않고 초안까지 쓴다. 템플릿의 기능 구성은 이미 정해져 있어서 무엇을
모으고 누구에게 넘기는지 대부분 미리 쓸 수 있다. 매 프로젝트가 같은 문장을 처음부터
다시 쓰면 빠뜨리는 항목이 생긴다.

동시에 운영 주체와 개인정보 보호책임자는 템플릿이 알 수 없다. 이 값을 빈칸으로
두는 대신 눈에 띄는 자리표시자로 남기면 채우지 않은 채 배포하는 일을 `grep` 하나로
막을 수 있다. 그럴듯한 예시 값을 넣으면 진짜 값처럼 보여서 그대로 제출된다.

`bun run setup`이 이 값까지 받게 만들면 앱을 처음 띄우려는 사람에게 사업자등록번호를
먼저 묻게 된다. 앱 이름과 식별자는 개발을 시작하려면 필요하지만 법률 문서의 운영 주체
정보는 스토어에 낼 때 필요하다. 두 시점이 다르므로 한 명령에 묶지 않는다.

## 재검토 조건

- `apps/web`에 로그인하는 화면이나 웹 대시보드가 필요해질 때. Astro 문서가 그 영역은
  다른 프레임워크가 낫다고 스스로 밝힌다.
- 랜딩 페이지가 요청마다 달라지는 내용이나 A/B 테스트를 요구할 때
- 법률 문서를 한국어 외 언어로 함께 제공해야 할 때
- 구독이나 결제가 제품에 들어와 Apple이 앱 안 이용약관 링크를 요구할 때
- Astro가 Vercel 정적 배포 또는 Markdown 콘텐츠 처리를 무설정으로 지원하지 않게 될 때
- 공개 사이트와 AI API를 한 배포 단위로 운영해야 할 이유가 생길 때
- 파생 프로젝트가 같은 자리표시자를 반복해서 손으로 채우는 일이 부담이 될 때. 그때는
  `bun run setup`이 아니라 스토어 제출 시점의 별도 명령을 검토한다.
- 템플릿에서 로그인 방법, AI 채팅 또는 프로필 사진이 빠지거나 새 외부 서비스가 붙어
  초안의 수집 항목과 제3자 목록이 실제와 어긋날 때

## 계속 제외하는 대안

- `apps/api`의 Hono가 공개 페이지를 함께 제공: 배포 단위를 늘리지 않지만
  [AI 서버 경계](ai-server-boundary.md)가 정한 AI 요청 담당 서버가 마케팅 문서까지
  소유하게 되고 두 배포 주기가 묶인다. 공개 페이지가 서버 상태에 의존해야 할 때
  재검토한다.
- Next.js: 로그인하는 웹 제품으로 커질 때 가장 열려 있지만 지금 담을 것이 읽는
  문서라 라우터와 hydration 비용을 그냥 낸다. `apps/web`에 로그인 화면이 들어올 때
  재검토한다.
- 빌드 없는 정적 HTML: 의존성이 없지만 공용 레이아웃과 목차를 페이지마다 반복하고
  법률 문서를 HTML 태그 사이에서 고쳐야 한다.
- 저장소 밖 외부 호스팅: 코드 작업이 없지만 문서가 Git 이력 밖으로 나가고, Google이
  요구하는 열람자가 고칠 수 없는 주소 조건을 서비스마다 따로 확인해야 한다.
- Expo Web으로 같은 앱에서 웹 출력:
  [모바일 개발 런타임](mobile-development-runtime.md)이 Expo Web을 개발하지 않기로
  정했다.
- `bun run setup`이 법률 문서의 운영 주체 정보까지 수집: 자리표시자를 한 번에 채울 수
  있지만 앱을 처음 띄우려는 사람에게 사업자등록번호를 먼저 묻게 되고, 알려진 설정
  필드만 바꾸는 [템플릿 프로젝트 정체성](template-project-identity.md)의 경계를
  넓힌다. 스토어 제출 시점에 도는 별도 명령이 필요해질 때 재검토한다.
- 법률 문서를 빈 제목 골격으로만 제공: 파생 프로젝트가 자기 상황에 맞게 쓰게 되지만
  템플릿이 이미 아는 수집 항목과 제3자를 매번 다시 조사하게 만들고 빠뜨리기 쉽다.
- 자리표시자 대신 그럴듯한 예시 값 넣기: 문서가 완성돼 보이지만 진짜 값과 구분되지
  않아 예시 회사 이름이 그대로 스토어에 올라간다.

## 보존할 근거

- App Store Connect에서 `Privacy Policy URL`과 `Support URL`은 필수다. `Support URL`은
  플랫폼 버전 정보 표에 "This property is required"로 적혀 있다. `Marketing URL`과
  `Promotional Text`에는 그 표시가 없어 선택 사항이다. `License Agreement`는 필수지만
  Apple 표준 EULA가 모든 지역에 기본 적용되므로 직접 쓴 약관 주소가 없어도 채워진다.
  [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
  · [Required, localizable, and editable properties](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties)
- Apple 심사 지침 5.1.1은 "All apps must include a link to their privacy policy in
  the App Store Connect metadata field and within the app in an easily accessible
  manner"라고 쓴다. 지침 1.5는 앱과 Support URL에 연락 수단을 두라고 요구한다.
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Google Play 사용자 데이터 정책은 "All apps must post a privacy policy link in the
  designated field within Play Console, and a privacy policy link or text within the
  app itself"이고 "Apps that do not access any personal and sensitive user data must
  still submit a privacy policy"다. 주소 조건은 "active, publicly accessible and
  non-geofenced URL (no PDFs) and is non-editable"다.
  [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- Google Play는 계정 삭제 요청 주소에 폼을 요구하지 않는다. 고객 지원 이메일도
  인정하며, 조건은 사용자를 앱으로 돌려보내 다시 설치하게 하지 않고 웹에서 요청을
  끝낼 수 있어야 한다는 것이다. 페이지 자체에는 스토어 등록명과 같은 앱 또는 개발자
  이름이 있어야 하고, 삭제 요청 경로가 눈에 띄고 찾기 쉬워야 한다. 삭제하는 데이터와
  남기는 데이터, 연장 보관 기간은 이 페이지가 아니라 개인정보처리방침에서 밝혀도 된다.
  [계정 삭제 요구사항](https://support.google.com/googleplay/android-developer/answer/13327111)
- 두 스토어 모두 이용약관 주소를 요구하지 않는다.
- 개인정보보호법 제30조는 처리방침을 수립하거나 변경할 때 정보주체가 쉽게 확인할 수
  있도록 공개하라고 정한다. 스토어 요구와 별개로 지켜야 한다.
- Astro 7.2.1이 2026-08 기준 최신이다. 정적 사이트가 기본이며 Vercel이 어댑터 없이
  배포한다. "Your Astro project is a static site by default. You don't need any extra
  configuration to deploy a static Astro site to Vercel."
  [Deploy your Astro Site to Vercel](https://docs.astro.build/en/guides/deploy/vercel/)
- Astro는 `llms.txt`를 제공하지 않는다. `https://docs.astro.build/llms.txt`는 404를
  반환하며, 공식 문서가 AI 도구용으로 안내하는 것은 Astro Docs MCP 서버다.
  [Building Astro sites with AI tools](https://docs.astro.build/en/guides/build-with-ai/)
