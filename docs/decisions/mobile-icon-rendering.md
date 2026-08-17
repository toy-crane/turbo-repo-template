# 모바일 아이콘 렌더링

## 결정

- 네이티브 셸의 아이콘은 그 표면을 소유한 Expo Router의 탭·툴바·메뉴 아이콘 API가 렌더링한다.
- `NativeTabs`에서는 하나의 아이콘 의미에 iOS SF Symbol과 Android Material Symbol 이름을 함께 지정한다. `NativeTabs.Trigger.Icon`의 `sf`와 `md`에 기본·선택 이름을 전달하고, iOS 전용 문자열만 공유 코드에 남기지 않는다.
- React Native UI는 `lucide-react-native`를 감싼 프로젝트 공통 `Icon`을 사용한다. iOS와 Android에서 같은 의미에 같은 SVG 실루엣을 렌더링하며, 기능 코드는 `lucide-react-native`를 직접 불러오지 않는다.
- HeroUI Native 컴포넌트가 기본 아이콘을 제공하는 자리는 해당 컴포넌트가 계속 소유한다. 제품 아이콘으로 바꿔야 할 요구가 확인될 때만 프로젝트 `Icon`으로 교체한다.
- `@expo/ui`의 `Host` 안에서는 `@expo/ui`가 제공하는 `Icon`을 사용한다. 이 API는 iOS에서 SF Symbol을, Android에서 Material Symbol XML을 렌더링한다.
- `Stack.Toolbar` 버튼의 아이콘은 `src/shared/ui/toolbar-icons.tsx`가 한곳에서 정의한다. 한 의미에 iOS SF Symbol 이름과 Android Material Symbol을 함께 적고, `icon` prop으로 넘긴다.
- Android 툴바 아이콘은 `@expo/material-symbols`가 아이콘마다 내주는 XML 벡터 드로어블을 쓴다. 배율별 PNG를 저장소에 두지 않는다.
- 툴바 아이콘의 플랫폼 분기는 `Platform.OS`가 아니라 `process.env.EXPO_OS`로 쓴다.
- 브랜드 로고나 제품 고유 그래픽은 프로젝트가 소유하는 이미지 또는 SVG 파일로 제공한다.

## 경계

- React Native UI 안에서 `@expo/ui`의 `Icon` 하나를 쓰기 위해 별도 `Host`를 만들지 않는다. 반대로 `@expo/ui`의 `Host` 안에 프로젝트 `Icon`이나 `SymbolView`를 삽입하지 않는다.
- 네이티브 셸과 `@expo/ui`에서는 플랫폼별 심벌의 세부 모양이 다른 것을 허용한다. React Native UI의 프로젝트 `Icon`은 두 플랫폼에서 같은 모양을 유지한다. 어느 쪽이든 의미와 접근성 라벨은 플랫폼 사이에서 동일하다.
- 한 화면에서 여러 범용 SVG 아이콘 세트를 섞지 않는다. 프로젝트 `Icon`이 라이브러리 이름, 크기와 색상 매핑을 소유한다.
- `@expo/material-symbols`는 `Stack.Toolbar` 버튼 전용이다. React Native UI의 아이콘은 프로젝트 `Icon`이 계속 소유한다.
- 툴바 아이콘의 한쪽 플랫폼을 비워 두지 않는다. Android에서 이미지 소스가 없는 `Stack.Toolbar.Button`은 작게 그려지는 것이 아니라 아무것도 그리지 않는다.
- Android 툴바에는 폭을 안정적으로 정할 수 없는 React Native 뷰를 넣지 않는다.
- 아이콘 색상은 적용되는 표면의 시맨틱 색상을 사용한다. 네이티브 탭의 선택·비선택 색상과 애니메이션은 탭 컴포넌트가 소유한다.
- 아이콘이 단독으로 동작을 전달하면 그 아이콘을 소유한 버튼, 탭 또는 컨트롤이 접근성 라벨을 제공한다.

## 이유

네이티브 셸과 `@expo/ui`는 운영체제가 소유하는 표면이므로 해당 API가 플랫폼 심벌, 크기, 선택 상태와 접근성 적응을 맡는 편이 자연스럽다. React Native UI는 두 플랫폼이 공유하는 제품 콘텐츠다. 이 영역에서 같은 SVG 아이콘을 사용하면 화면 안의 모양, 크기와 배치를 일정하게 유지하고 플랫폼별 아이콘 구현을 따로 관리하지 않아도 된다.

프로젝트 `Icon`을 공개 경계로 두면 기능 코드가 특정 SVG 라이브러리에 묶이지 않는다. `lucide-react-native`는 이미 설치된 `react-native-svg` 렌더링 경로를 사용하며 아이콘 폰트의 비동기 로딩도 만들지 않는다. `Icon`이라는 이름은 역할을 바로 드러내며 앱 런처 아이콘을 뜻하는 `AppIcon`과도 구분된다.

## 재검토 조건

- Lucide에 중요한 제품 개념을 표현할 적절한 아이콘이 없거나 제품의 고유 아이콘 언어가 정해진다.
- Lucide 아이콘이 HeroUI Native의 기본 아이콘과 한 화면에서 어울리지 않는다는 검증 결과가 나온다.
- React Native UI에서도 플랫폼별 아이콘 차이가 기능 인식에 필요하다는 사용자 검증 결과가 나온다.
- 실제 배포 빌드에서 `lucide-react-native`의 번들 크기나 렌더링 비용이 문제가 된다.
- `@expo/material-symbols`에 필요한 아이콘이 없거나, alpha인 `Stack.Toolbar`의 아이콘 API가 바뀐다.
- Metro가 `process.env.EXPO_OS` 분기에서 쓰지 않는 쪽 자산을 실제로 걷어내지 못하는 것이 배포 빌드에서 확인된다.

## 계속 제외하는 대안

- React Native UI에서 `expo-symbols` 사용: 플랫폼별 시스템 심벌을 하나의 API로 제공하지만 현재 Beta이며 Android에서는 Material Symbols 폰트를 비동기로 불러온다. React Native UI에 플랫폼별 모양이 필요해질 때 재검토한다.
- React Native UI의 개별 아이콘을 `@expo/ui` `Host`로 감싸기: 아이콘 하나 때문에 렌더러 경계와 레이아웃 소유권이 갈린다. 해당 화면 전체를 `@expo/ui`가 소유할 때만 사용한다.
- 기능 코드에서 `lucide-react-native` 직접 사용: 아이콘 이름과 라이브러리 API가 기능 전체로 퍼져 교체와 시각 규칙 변경이 어려워진다.
- 범용 아이콘 폰트: 두 플랫폼에서 같은 모양을 만들 수 있지만 폰트 로딩과 별도 API를 추가한다. SVG 렌더링이 실제 성능 문제를 만들 때 재검토한다.
- Android 툴바 아이콘을 손으로 내보낸 배율별 PNG로 두기: 같은 Material Symbols를 쓰면서도 아이콘 하나마다 파일 세 개를 만들어야 하고, 툴바의 tint를 따르지 못해 색이 내보낸 시점에 굳는다. 새 아이콘을 더할 때마다 그 비용이 다시 든다.
- 툴바 아이콘에 `react-native-nitro-symbols`나 프로젝트 `Icon` 사용: `Stack.Toolbar`가 네이티브로 그리므로 Android는 React 뷰가 아니라 이미지 소스만 받는다.

## 보존할 근거

- 설치된 Expo Router `NativeTabs`는 `Trigger.Icon`의 `sf`와 `md` 정의를 각 플랫폼의 네이티브 탭 아이콘으로 변환한다.
- Expo SDK 57의 [`@expo/ui` `Icon`](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/icon/)은 `Host` 안에서 iOS SF Symbol과 Android Material Symbol XML을 렌더링한다.
- `react-native-svg`는 HeroUI Native의 직접 peer dependency로 이미 모바일 앱에 설치되어 있고, HeroUI Native의 기본 검색·닫기·체크 아이콘도 SVG로 렌더링한다.
- Expo SDK 57의 `expo-symbols`는 Android에서 약 939KB인 기본 Material Symbols 폰트를 `expo-font`로 불러오고 완료 전에는 같은 크기의 빈 뷰를 렌더링한다.
- 설치된 Expo Router의 `Stack.Toolbar.Button`은 아이콘을 iOS 심벌 이름 또는 Android 이미지 자산으로 받는다. Android 구현은 이미지 소스가 없으면 경고를 남기고 `null`을 반환한다. 그래서 아이콘을 빠뜨린 버튼은 화면에도 접근성 트리에도 나타나지 않는다.
- Expo Router 문서의 [Stack.Toolbar](https://docs.expo.dev/router/advanced/stack-toolbar/)는 Android 아이콘의 권장 출처로 `@expo/material-symbols`를 지목하고, 두 플랫폼을 한 곳에서 쓰는 방법으로 `process.env.EXPO_OS` 분기를 안내한다. Metro가 이 값을 빌드 시점에 문자열로 바꾸고 맞지 않는 가지를 걷어낸다.
- `@expo/material-symbols@0.1.1`은 네이티브 코드와 config plugin이 없는 자산 패키지이고, `xml`은 Expo 기본 Metro 설정의 `assetExts`에 이미 들어 있다.
