# Glossary

이 문서는 모바일 앱의 UI 렌더러 경계를 설명할 때 사용하는 프로젝트 표준 용어를 정의한다.

**React Native UI**:
화면의 구조, 레이아웃과 상호작용을 React Native 컴포넌트가 소유하는 UI다. React Native가 최종적으로 플랫폼 네이티브 뷰를 렌더링한다는 사실만으로 플랫폼 UI라고 부르지 않는다.
_Avoid_: RN 네이티브 UI, JavaScript UI

**네이티브-backed RN 컴포넌트**:
React Native API와 컴포넌트 트리 안에서 사용하지만 특수한 표현이나 동작은 플랫폼 네이티브 구현이 담당하는 컴포넌트다. `GlassView`와 `BlurView`가 대표적인 예다.
_Avoid_: 호스팅된 SwiftUI, 플랫폼 UI 컴포넌트

**호스팅된 SwiftUI**:
React Native 화면 안의 `Host` 경계를 통해 삽입한 SwiftUI 서브트리다. `Host` 바깥은 React Native가, 그 안의 렌더링과 레이아웃은 SwiftUI가 담당한다.
_Avoid_: SwiftUI 스타일 RN 컴포넌트, 네이티브-backed RN 컴포넌트

**호스팅된 Compose**:
React Native 화면 안의 `Host` 경계를 통해 삽입한 Jetpack Compose 서브트리다. `Host` 바깥은 React Native가, 그 안의 렌더링과 레이아웃은 Compose가 담당한다.
_Avoid_: Compose 스타일 RN 컴포넌트, 네이티브-backed RN 컴포넌트

**네이티브 셸**:
플랫폼 내비게이션이 소유하는 화면 외곽 구조로, 네이티브 헤더, 툴바, 모달 표시 방식과 전환 제스처를 포함한다.
_Avoid_: 화면 콘텐츠, React Native UI 셸

**플랫폼 UI**:
React Native UI와 큰 경계를 대비할 때 호스팅된 SwiftUI, 호스팅된 Compose와 네이티브 셸을 함께 가리키는 상위 용어다. 구체적인 구현을 말할 때는 더 정확한 하위 용어를 사용한다.
_Avoid_: 네이티브 UI
