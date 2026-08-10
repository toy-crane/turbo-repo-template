# 모바일 개발 런타임

## 결정

- 모바일 앱은 Expo SDK 57로 시작한다.
- 지원 플랫폼은 iOS와 Android로 한정하며 Expo Web은 개발하지 않는다.
- `expo-dev-client`를 포함하고, 앱 전용 Development Build를 기본 네이티브 개발 런타임으로 사용한다.
- 일상적인 iOS·Android 개발에는 로컬에서 컴파일한 Development Build를 우선 사용한다. Expo Go는 기본 개발 방식으로 지원하지 않는다.
- Expo SDK 57의 iOS Development Build는 `expo-build-properties`의 `ios.buildReactNativeFromSource`를 켜서 React Native를 소스에서 빌드한다.

## 경계

- JavaScript만 변경했을 때는 설치된 Development Build를 재사용한다. 네이티브 의존성, 네이티브 설정 또는 Expo SDK가 변경되면 바이너리를 다시 빌드한다.
- 이 결정은 로컬 개발 런타임만 다룬다. 원격 Development Build, TestFlight 및 스토어 배포 방식은 필요해질 때 별도로 결정한다.

## 이유

Development Build는 앱의 네이티브 의존성 구성과 일치하고, 프로덕션 수준의 네이티브 기능을 지원하며, 정밀한 진단에 필요한 Hermes와 네이티브 디버깅 경로를 제공한다. Expo Go는 학습과 빠른 실험에 맞춰져 있어 SDK 선택과 네이티브 연동을 제한한다. 현재 개발 환경에서 iOS를 로컬로 빌드할 수 있으므로, 로컬 컴파일을 기본으로 삼으면 클라우드 계정과 유료 빌드 시간에 의존하지 않아도 된다. React Native 소스 빌드는 깨끗한 빌드 시간을 늘리지만 현재 Apple 도구 체계의 링크 충돌을 피한다.

## 재검토 조건

- Expo가 Development Build를 대체하는 더 나은 권장 런타임을 제공할 때
- 웹 지원이 제품 범위에 추가될 때
- 모바일 앱에 네이티브 플랫폼이나 네이티브 의존성이 더 이상 필요하지 않을 때
- 로컬 빌드 방식으로 지원할 수 없는 실물 기기에 서명된 빌드를 공유해야 할 때
- 향후 Expo SDK 업그레이드로 Development Client 또는 로컬 빌드 방식이 달라질 때

## 계속 제외하는 대안

- Expo Go를 기본 런타임으로 사용: 앱 전용 네이티브 런타임을 재현하지 못하고 네이티브 연동을 제한한다. 독립적인 학습이나 일회성 실험에만 재검토한다.
- EAS Build만으로 Development Build를 생성: 기본 개발 과정에 계정, 서명, 네트워크 및 잠재적인 과금 의존성을 추가한다. 원격 배포가 팀의 일상적인 요구가 될 때 재검토한다.

## 보존할 근거

- Expo SDK 57과 로컬 Apple 도구 체계에서는 사전 빌드된 React Core가 Development Build와 링크 충돌을 일으켰다. `ios.buildReactNativeFromSource`를 켠 깨끗한 iOS 빌드는 같은 환경에서 설치와 실행까지 통과했다. Expo SDK나 Apple 도구 체계를 올릴 때 깨끗한 빌드로 충돌이 사라졌음을 확인한 뒤 이 설정을 제거한다.
