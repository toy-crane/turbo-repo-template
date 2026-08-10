# 모바일 아이콘 렌더링

## 결정

- 네이티브 셸의 아이콘은 그 표면을 소유한 Expo Router의 탭·툴바·메뉴 아이콘 API가 렌더링한다.
- `NativeTabs`에서는 하나의 아이콘 의미에 iOS SF Symbol과 Android Material Symbol 이름을 함께 지정한다. `NativeTabs.Trigger.Icon`의 `sf`와 `md`에 기본·선택 이름을 전달하고, iOS 전용 문자열만 공유 코드에 남기지 않는다.
- React Native 화면의 아이콘은 공용 `Icon` 컴포넌트(`src/shared/ui/icon/`)가 렌더링한다. iOS는 `expo-symbols` 직접 의존성의 `SymbolView`로 SF Symbol을 그리고, Android는 필요한 Material Symbols의 path 데이터를 저장소 안 TypeScript 레코드로 두고 `react-native-svg`로 그린다.
- `Icon`도 하나의 아이콘 의미에 iOS SF Symbol 이름과 Android Material Symbol path를 함께 정의한다. iOS 전용 문자열만 공유 코드에 남기지 않는 규칙은 RN 화면에도 동일하게 적용한다.
- `@expo/ui`의 `Host` 안에 아이콘이 필요하면 공통 `Icon`을 사용한다. `SymbolView`를 `Host` 안에 삽입하지 않는다.
- `Stack.Toolbar` 버튼의 아이콘은 `src/shared/ui/icon/toolbar-icons.tsx`가 한곳에서 정의한다. iOS는 SF Symbol 이름을, Android는 `assets/toolbar/`의 PNG를 `icon` prop으로 넘긴다. 중첩 `Stack.Toolbar.Icon`은 사용하지 않는다.
- 툴바용 PNG는 `Icon`이 path로 그리는 것과 같은 Material Symbols 글리프를 1x, 2x, 3x로 내보낸 것이다. 같은 출처 표기를 파일에 함께 둔다.
- 시스템 심벌로 표현할 수 없는 브랜드 로고나 고유 그래픽만 이미지 또는 SVG 파일로 제공한다.

## 경계

- 범용 아이콘 폰트나 서드파티 아이콘 디자인 시스템은 RN 화면에도 추가하지 않는다.
- 툴바 PNG는 `Stack.Toolbar` 버튼 전용이다. RN 화면 아이콘은 계속 `Icon`이 그린다. Android 툴바는 Compose로 그려서 RN 뷰를 담으면 폭을 정하지 못하므로, 툴바 안에 `Stack.Toolbar.View`로 RN 뷰를 넣지 않는다.
- 저장소에 두는 Material Symbols path 데이터는 실제로 쓰는 아이콘만 담고 Apache-2.0 출처 표기를 같은 파일에 둔다. `.svg` 파일 자산이나 metro 변환기는 추가하지 않는다.
- 플랫폼별 심벌의 세부 모양이 다른 것은 의도된 차이다. Home, Activity, Settings처럼 의미와 접근성 라벨은 플랫폼 사이에서 동일하게 유지한다.
- 아이콘 색상은 적용되는 표면의 시맨틱 색상을 사용한다. 탭의 선택·비선택 색상과 애니메이션은 탭 컴포넌트가 소유한다.
- 아이콘이 단독으로 동작을 전달하면 그 아이콘을 소유한 버튼, 탭 또는 컨트롤이 접근성 라벨을 제공한다.

## 이유

현재 셸은 플랫폼 관례를 따르는 표현과 낮은 구현 복잡도를 우선한다. `NativeTabs`가 아이콘 변환과 네이티브 탭 항목 생성을 맡으면 앱이 별도 아이콘 뷰의 크기, 색조, 선택 상태와 접근성을 보정할 필요가 없다. 같은 이유로 `Host` 내부에서도 해당 표면의 공통 API를 사용한다.

AI 채팅이 RN 화면에 처음으로 아이콘 버튼(생성 중지, 복사, 최신 메시지로 이동 등)을 요구하면서 유보했던 RN 화면 방식을 정했다. 시스템 심벌 방향은 유지하되, Android에는 RN에서 쓸 시스템 심벌 뷰가 없으므로 공식 Material Symbols 원본에서 필요한 path만 가져와 이미 설치된 `react-native-svg`로 그린다. 아이콘 폰트, 전체 아이콘 세트, 새 빌드 도구를 모두 피하는 가장 작은 추가다.

## 재검토 조건

- 중요한 제품 개념을 표현할 적절한 SF Symbol 또는 Material Symbol이 없다.
- 플랫폼마다 같은 실루엣을 유지해야 하는 브랜드 아이콘 언어가 제품 요구사항으로 정해진다.
- 시스템 심벌의 플랫폼별 차이 때문에 사용자가 같은 기능으로 인식하지 못한다는 검증 결과가 나온다.

## 계속 제외하는 대안

- 범용 아이콘 폰트: 두 플랫폼에서 같은 모양을 만들 수 있지만 현재 필요한 시스템 아이콘을 위해 별도 폰트와 API를 추가할 이유가 없다. 브랜드 아이콘 체계가 필요해지면 재검토한다.
- 서드파티 SVG 아이콘 세트: 세밀한 시각 통일에는 유리하지만 현재의 플랫폼 네이티브 방향에는 불필요하다. 시스템 심벌의 한계가 실제로 확인되면 재검토한다.
- `.svg` 파일 자산과 metro SVG 변환기: path 데이터 TypeScript 레코드보다 파일과 빌드 설정이 늘어난다. 아이콘 수가 많아져 레코드 관리가 어려워지면 재검토한다.

## 보존할 근거

- 설치된 Expo Router `NativeTabs`는 `Trigger.Icon`의 `sf`와 `md` 정의를 각 플랫폼의 네이티브 탭 아이콘으로 변환한다.
- `expo-symbols`는 RN 화면의 `Icon` 안에서만 사용한다. 네이티브 셸 표면(탭, 툴바, 메뉴)의 아이콘은 계속 Expo Router의 API가 소유한다.
