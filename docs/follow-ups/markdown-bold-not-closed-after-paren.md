# 닫는 `**` 앞이 괄호면 굵은 글씨가 원문 그대로 보인다

**Symptom**: AI 답변의 `**새 아키텍처(New Architecture)**는`이 굵은 글씨 대신
별표가 그대로 남은 `**새 아키텍처(New Architecture)**는`으로 보인다. 같은 답변
안의 `**TurboModule**과`, `**Fabric**:`은 정상적으로 굵게 그려진다.

**Observed evidence**: iOS 26 Development Build(시뮬레이터
`turbo-repo-mobile-dev-3`)에서 대화 화면에 긴 답변을 받아 확인했다.
`react-native-enriched-markdown` 1.0.1을 `StreamdownText`가 `flavor="github"`으로
그린 화면이다. 답변 복사로 받은 원문은
`React Native의 **새 아키텍처(New Architecture)**는 기존 React Native의 핵심 통신
방식과 렌더링 구조를 개선하기 위한 일련의 변화입니다.`였다. 원문에 오류가 없으므로
읽는 쪽에서 갈렸다.

**Suspected cause**: 렌더러가 쓰는 md4c의 구분자 판정으로 보인다. 닫는 `**` 바로
앞이 문장 부호 `)`이고 바로 뒤가 한글 조사 `는`인 경우다. CommonMark의 right-flanking
규칙으로는 앞이 공백이 아니고 뒤가 문장 부호가 아니므로 닫을 수 있어야 하는데,
이 조합에서만 닫지 못한다. 조사가 붙는 한국어 문장에서 괄호로 끝나는 강조는 흔한
모양이라 다시 만날 수 있다.

**What was tried**: 아무것도 손대지 않았다. Markdown 해석은 렌더러가 소유하고,
[모바일 AI 채팅 표현](../decisions/mobile-ai-chat-rendering.md)은 GFM으로 해석한다는 것까지만
정한다. 앱에서 원문을 고치면 서버가 보낸 답변을 바꾸게 되므로 우회하지 않았다.
다른 강조는 모두 정상이라 답변을 읽는 데는 지장이 없다.

**Proposed next step**: 현재 앱은 `StreamdownText`를 거치지 않으므로 먼저 같은 입력이
여전히 별표로 보이는지 확인한다. 재현되면 `react-native-enriched-markdown` 저장소의
예제 앱에서도 확인하고, md4c 단계에서 갈리면 상류에 이슈로 올린다. 현재 앱에서
재현되지 않으면 이전 `StreamdownText` 보완 단계와의 상호 작용이 원인이었는지 별도
재현으로 확인한다.
