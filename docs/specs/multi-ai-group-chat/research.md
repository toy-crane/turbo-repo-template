# 다자간 AI 대화 리서치

사용자 1명과 AI 여러 명이 한 대화방에서, 주어진 상황을 놓고 함께 대화하는 기능을 검토했다.
이 문서는 결정을 내리기 전의 조사 기록이다. 무엇이 가능한지, 어디가 한계인지, 무엇을
맞바꿔야 하는지, 어떤 요구사항이면 받아들일 수 있는지를 정리한다. 확정 명세는 셰이핑을
마친 뒤 이 폴더의 `spec.md`로 따로 쓴다.

조사일: 2026-08-20

## 한눈에 보는 결론

- **이 프로젝트의 스택으로 만들 수 있다.** 서버가 한 요청 안에서 발화자를 정해 순서대로
  생성하고, 하나의 스트리밍 응답에 여러 발화를 실어 보내는 패턴을 이 프로젝트가 고정한
  AI SDK 버전(`ai@7.0.58`)에서 실제로 실행해 확인했다.
- **어떤 프레임워크도 이 문제를 통째로 대신 풀어 주지 않는다.** AI SDK에는 그룹 대화
  기능이 없고, AutoGen이나 Semantic Kernel 같은 전용 프레임워크도 서버 오케스트레이션
  루프의 모양만 알려 준다. 모바일 채팅 UI까지 잇는 일은 어차피 직접 해야 한다.
- **실제 제품들의 규칙은 거의 하나로 수렴한다.** 이름을 부르면 그 AI가 반드시 답한다.
  생성은 한 번에 한 명씩이다. 부르지 않은 AI는 조용히 있는 것이 기본값이다. AI끼리의
  대화는 상한과 지연을 두고 사용자가 켜는 기능이다. 사용자는 언제든 특정 AI를 지목하거나
  음소거할 수 있다.
- **인원은 2~4명이 적정선이다.** 제품들의 상한은 10명 안팎이지만, 커뮤니티 실전과 연구
  근거 모두 그보다 훨씬 작은 인원에서 품질이 유지된다고 말한다.
- **"여럿이 논의하면 답이 더 정확해진다"는 기대는 근거가 약하다.** 이 기능의 가치는
  정확도가 아니라 경험(여러 관점, 역할극, 생동감)에서 찾아야 한다.
- **비용이 핵심 제약이다.** AI 응답 수가 사용자 메시지당 몇 배로 늘고, 대화록을 매 호출에
  다시 보낸다. 유사 기능을 내놨다가 접은 제품이 여럿이라는 사실도 신중할 이유다. 다만
  종료 이유를 비용이라고 밝힌 제품은 없다(아래 실패 방식 참고).
- **페르소나는 프롬프트만으로 유지되지 않는다.** 몇 라운드 만에 말투가 무너지고 서로의
  성격을 흡수한다는 측정이 있다. 발화 경계에서 자르는 장치와 주기적인 역할 재주입이
  필요하다.

## 이 프로젝트의 출발점

현재 저장소에는 1:1 AI 채팅이 이미 있다. 다자간 대화를 검토할 때 전제가 되는 사실은
다음과 같다.

- 서버는 Hono의 `POST /ai/chat` 하나다. 요청마다 `streamText()`를 한 번 호출해 답변
  메시지 1개를 UI Message Stream으로 돌려준다(`apps/api/src/features/ai-chat/route.ts`).
- 모델은 서버 환경 변수 `AI_GATEWAY_MODEL` 하나로 고정하고 Vercel AI Gateway를 거친다.
  모바일은 모델을 고르지 않는다([AI 모델 라우팅](../../decisions/ai-model-routing.md)).
- 모바일은 `@ai-sdk/react`의 `useChat()`으로 상태를 관리한다. 메시지는 `user`와
  `assistant` 역할 2개뿐이고, 누가 말했는지를 담는 자리가 없다.
- 수정, 답변 다시 받기, 다시 시도 같은 메시지 동작은 "질문 1개에 답변 1개"를 전제한다
  ([모바일 채팅 메시지 동작](../../decisions/mobile-chat-message-actions.md)).
- 대화는 메모리에만 있고 저장하지 않는다. 사용량 제한 수치는 아직 정하지 않았다
  ([AI 채팅 프로토콜](../../decisions/ai-chat-protocol.md), [AI 서버 경계](../../decisions/ai-server-boundary.md)).

즉 다자간 대화에 필요한 조각 중 "발화자 정체성", "요청 1건에 여러 발화", "다자간에 맞는
메시지 동작"이 지금은 없다.

## 조사 방법

세 갈래로 조사했다.

- **라이브러리와 프레임워크**: Vercel AI SDK, Microsoft AutoGen(0.2와 0.4+), AG2,
  Semantic Kernel, LangGraph, OpenAI Agents SDK, CrewAI, Google ADK, Letta, PydanticAI의
  공식 문서와 소스를 읽었다. AI SDK는 이 프로젝트가 고정한 `ai@7.0.58`과
  `@ai-sdk/react@4.0.61`을 실제로 실행해 다중 발화 스트림 동작을 확인했다.
- **제품과 커뮤니티**: SillyTavern, ChatGPT 그룹 채팅, Character.AI, Poe, Kindroid,
  Shapes, Meta AI(WhatsApp), Talkie의 공식 문서, 발표 기사, GitHub 이슈를 읽었다. 이번
  조사 환경에서는 Reddit 접근이 막혀 커뮤니티 경험은 GitHub 이슈와 공식 위키에서 모았다.
- **논문과 엔지니어링 블로그**: 멀티 에이전트 실패 분류, 에이전트 토론의 효과 재검증,
  페르소나 유지, 발화 순서 결정, 비용 측정을 다룬 1차 출처를 읽었다.

## 모든 시스템이 만나는 다섯 가지 설계 축

프레임워크와 제품을 통틀어, 다자간 대화 설계는 결국 같은 다섯 가지 질문으로 줄어든다.

### 1. 다음 발화자를 누가 정하는가

선택지는 닫힌 목록에 가깝다. 모든 시스템이 이 안에서 고르거나 섞는다.

- **사용자 지목**: 이름을 부르거나(@멘션) 아바타를 눌러 지정한다. 모든 제품이 제공하는
  기본 수단이다(Poe, Character.AI, Kindroid, Meta AI, ChatGPT 그룹 채팅).
- **규칙**: 순서대로(round robin), 무작위, 마지막 메시지에 이름이 언급된 캐릭터 활성화,
  "이번 라운드에 아직 말 안 한 사람 우선" 같은 공정성 풀(SillyTavern의 활성화 전략,
  AutoGen `RoundRobinGroupChat`, AG2 `RoundRobinPattern`).
- **LLM 진행자**: 작은 모델 호출 하나가 대화록과 각 캐릭터 설명을 읽고 다음 발화자
  이름을 고른다(AutoGen `SelectorGroupChat`, AG2 `AutoPattern`, Semantic Kernel
  `KernelFunctionSelectionStrategy`, LangGraph supervisor). 성숙한 시스템은 모두 코드
  규칙이 LLM 선택을 덮어쓸 수 있게 한다.
- **발화자가 다음을 지목**: 지금 말한 에이전트가 `transfer_to_X` 같은 도구로 다음을
  넘긴다(OpenAI Agents SDK handoff, AutoGen `Swarm`, LangGraph swarm). 마지막으로 말한
  에이전트가 다음 사용자 메시지도 이어받는 "끈적한 발화권" 모델이라, 여럿이 번갈아
  말하는 그룹 대화보다는 상담 창구 라우팅에 맞는 모양이다.

연구 근거도 이 축을 뒷받침한다. 사람 대화의 순서 교대 규칙(질문받은 사람이 답할 의무,
아니면 자원자가 나섬)을 LLM 그룹 대화에 적용한 실험에서 대화 붕괴가 크게 줄고 사람 평가
점수가 두 배 가까이 올랐다(arXiv 2412.04937). LLM은 "지목된 다음 발화자"는 잘 맞히지만
"자발적으로 끼어들 사람"은 잘 못 맞히므로(arXiv 2606.17542), 자발 발화에는 발화 욕구
점수(bidding) 같은 별도 장치가 필요하다.

### 2. 언제 멈추고 사용자에게 차례를 돌려주는가

- 모든 프레임워크가 최대 라운드 상한을 둔다(`max_round`, `max_turns`,
  `MaximumIterations`). 상한 없는 AI끼리의 대화는 어디서나 버그로 취급한다.
- Semantic Kernel의 현행 `GroupChatManager`는 매 라운드에 정해진 순서로 검사한다.
  "사용자 입력을 받을 차례인가"를 가장 먼저 묻고, 그다음 종료 여부, 그다음 다음 발화자를
  고른다. 사람에게 차례를 돌려주는 검사가 1순위라는 점이 요지다.
- AutoGen 문서는 생성 도중에 사람 입력을 기다리며 실행을 막는 방식(`UserProxyAgent`)을
  피하라고 명시한다. 사람 입력은 요청과 요청 사이(run 경계)에서 받는 것이 안전하다.
  HTTP 요청 1건을 한 run으로 보는 우리 구조와 자연스럽게 맞는다.
- ChatGPT 그룹 채팅의 핵심 설계는 "침묵도 정답"이다. 부르면 반드시 답하고, 아니면
  모델이 답할지 말지를 스스로 판단하며 조용히 있는 쪽이 기본값이다.

### 3. 문맥을 어떻게 공유하고 발화자를 어떻게 표시하는가

- 기본형은 어디서나 같다. **모두가 보는 대화록 하나 + 메시지마다 발화자 이름**이다
  (AutoGen의 `source` 필드, Semantic Kernel의 에이전트 이름, LangGraph의 노드 메타데이터).
  모델에게 넣을 때는 각 발화 앞에 "이름:"을 붙이는 방식이 표준이다.
- 페르소나별 비밀 정보(다른 캐릭터가 모르는 사실)는 예외적인 고급 기능이다.
  SillyTavern도 지원하지 못해 이슈로 남아 있다(#4527). Letta처럼 에이전트별 사설 기억을
  둔 시스템도 공유 채널 위에 얹는 구조다.
- 프롬프트 구성에는 두 갈래가 있고 실제 트레이드오프다.
  - **발화자별 호출**: 이번에 말할 캐릭터의 설정만 프롬프트에 넣는다(SillyTavern 기본,
    Character.AI, Kindroid). 목소리가 깨끗하게 분리되지만 캐릭터가 서로의 설정을 모르고,
    캐릭터 수만큼 호출이 늘어난다.
  - **병합 호출**: 전원 설정을 한 프롬프트에 합쳐 한 호출이 여러 명을 연기한다
    (SillyTavern "Join character cards", Talkie의 그룹 캐릭터 카드). 싸고 문맥이 하나로
    유지되지만 목소리가 섞이고 캐릭터별 통제가 약해진다.
- 기억은 격리가 기본값이다. ChatGPT 그룹 채팅은 개인 메모리를 읽지도 쓰지도 않았고,
  Kindroid는 캐릭터가 자기 기억만 보게 하고 공유는 꺼진 토글로 두었다.

### 4. 화면에는 어떻게 흘려보내는가

- 생성은 어디서나 **한 번에 한 명, 순차**다. 같은 방에 AI 답변 두 개를 병렬로 생성해
  흘리는 제품은 없다. 순차라야 다음 캐릭터가 앞 캐릭터의 말을 받아칠 수 있고, 화면도
  자연스럽다.
- 프레임워크들은 "발화자 라벨이 붙은 메시지의 연속"을 스트리밍으로 내보내는 데서 멈춘다.
  그것을 채팅 UI 상태로 잇는 반쪽은 프레임워크 밖의 일이고, 우리 스택에서는 AI SDK의
  UI Message Stream이 그 자리를 맡는다. 이 부분의 실행 검증 결과는 아래
  "이 스택에서 확인한 것"에 적었다.

### 5. 비용을 어떻게 억제하는가

- 라운드마다 호출이 N번(LLM 진행자를 쓰면 N+1번)이고, 매 호출에 자라나는 대화록을 다시
  보낸다. Anthropic의 측정으로는 에이전트 작업이 일반 채팅의 약 4배, 멀티 에이전트
  시스템은 약 15배의 토큰을 쓴다.
- 모두가 같은 처방을 말한다. 라운드 상한을 두고, 호출마다 대화록을 줄여 넣고
  (Semantic Kernel `HistoryReducer`, AI SDK `prepareStep`의 메시지 정리), 진행자 호출은
  작게 유지하고, 캐릭터가 사용자에게 직접 말하게 해서 중계 비용을 없앤다. LangGraph
  진영은 supervisor가 부하의 답을 다시 옮겨 말하는 "전화 놀이" 비용을 측정해, 답을
  그대로 전달하는 `forward_message` 도구로 큰 개선을 봤다고 보고한다.
- 과금 모델의 참고 사례: ChatGPT 그룹 채팅은 사용자 메시지가 아니라 **AI 응답 수만**
  한도에서 차감했고, Poe는 봇마다 메시지 단가를 보여 준다. 다자간에서 요금과 한도는
  "AI 응답 1건" 단위로 세는 것이 맞다.

## 실제 제품들이 수렴한 UX 규칙

여러 제품이 따로 만들었는데 같은 자리에 도착했다. 설계할 때 그대로 받아들여도 좋은
규칙들이다.

1. 이름을 부르면(@멘션, 아바타 탭) 그 AI가 반드시 답한다. 사용자가 항상 이해하는 유일한
   통제 수단이다.
2. 부르지 않은 AI는 조용히 있는 것이 기본값이다. 나서는 정도는 캐릭터별로 조절하는
   사다리로 제공한다(Shapes의 Free Will 5단계, SillyTavern의 talkativeness 슬라이더).
3. 생성은 한 번에 한 명씩이고, 한 메시지에는 한 목소리만 담는다. SillyTavern은 생성 중에
   다른 캐릭터 목소리가 나오면 그 지점에서 잘라 버린다.
4. 사용자는 특정 캐릭터를 강제로 말하게 할 수 있고(Force Talk), 음소거할 수 있다.
5. 시끄러운 캐릭터의 독점을 막는 공정성 규칙이 있다. "지난 사용자 메시지 이후 아직 말
   안 한 캐릭터 중에서 뽑기"(SillyTavern Pooled order)가 검증된 예다.
6. AI끼리 이어 말하기는 상한, 지연(SillyTavern Auto Mode는 5초 간격), 사용자가 입력을
   시작하면 즉시 중단이라는 세 가지 안전장치를 달고 사용자가 켠다. Discord 봇 문화의
   제1규칙도 "봇은 봇을 무시한다"이다.
7. 상황(시나리오)은 방이 소유한다. 캐릭터 카드가 아니라 그룹 수준의 상황 설정이 전원에게
   적용된다(SillyTavern Scenario Override, Kindroid Group context, ChatGPT 그룹별 지침).
8. 인원 상한은 10명 안팎이되, 안내는 2~5명을 권한다.
9. 한도와 요금은 AI 응답 단위로 센다.

반복해서 보고된 실패 방식도 일관된다.

- **목소리 섞임**: 캐릭터가 서로를 대신해 말한다. 프롬프트만으로는 못 막아서 생성 결과를
  발화 경계에서 자르는 후처리가 표준 대응이다(SillyTavern 이슈 #1211).
- **과다 발화**: 부르지도 않았는데 AI가 계속 끼어들면 스팸처럼 읽힌다. ChatGPT가 "언제
  조용히 있을지"를 따로 학습시킨 이유다.
- **발화자 선택 불만**: 언급, 수다스러움, 순서 같은 휴리스틱은 결국 불만이 쌓여 사용자들이
  LLM 진행자를 직접 만들어 붙인다(SillyTavern discussion #4130).
- **문맥 비대와 사각지대**: 캐릭터 설정을 서로 못 보거나, 공유하려면 카드마다 복사해
  토큰이 불어난다.
- **작은 모델의 붕괴**: 인원이 늘수록 페르소나 분리가 무너져, 커뮤니티는 그룹 전용
  파인튜닝 모델과 캐릭터별 모델 배정 확장까지 만들었다.
- **짧게 살다 사라진 기능들**: Character.AI Rooms 폐지(2024), Meta 셀럽 페르소나
  폐지(2024), Shapes의 Discord 퇴출(2025), ChatGPT 그룹 채팅 종료(2026, 약 8개월 만).
  사례의 성격은 서로 다르다. Meta 셀럽 페르소나는 다자간 대화가 아닌 개별 페르소나
  봇이었고, Shapes는 비용이 아니라 플랫폼 정책 분쟁으로 퇴출되었으며, OpenAI가 밝힌
  종료 이유는 제품을 단순하게 유지한다는 것이었다. 비용이나 리텐션이 공통 원인이라는
  사후 분석은 출처에 없고, 원가 구조가 이런 기능을 유지하기 어렵게 만들었으리라는 것은
  이 문서의 추정이다. 다만 응답 수를 작고 예측 가능하게 유지하고 2~3명 인원에서도
  가치 있게 설계하자는 교훈은 원인 단정 없이도 성립한다.

## 연구 근거가 말하는 것

- **정확도 목적의 다자간은 근거가 약하다.** 2023년의 멀티 에이전트 토론 논문(arXiv
  2305.14325)은 수학과 사실성 벤치마크에서 향상을 보였지만, 이후 재검증들은 같은 비용의
  단일 모델 self-consistency를 안정적으로 이기지 못한다고 보고한다(arXiv 2311.17371,
  arXiv 2502.08788). 토론이 오히려 정답을 오답으로 뒤집는 사례가 더 많다는 측정도
  있다(arXiv 2509.05396). 에이전트들이 서로에게 동조해 틀린 합의로 수렴하는 현상은
  여러 연구에서 반복 확인된다.
- **경험 목적의 다자간은 근거가 있다.** 순서 교대 규칙을 넣은 오케스트레이션이 대화
  품질을 크게 올렸고(arXiv 2412.04937), 캐릭터별 기억과 관계 요약으로 발화를 조건화한
  Smallville 실험(arXiv 2304.03442)은 사람이 쓴 대본보다 높은 believability를 받았다.
  끼어들 타이밍을 내적 동기 점수로 정하는 설계(CHI 2025, arXiv 2501.00383)도 사람+AI
  다자 대화에서 자연스러움을 올렸다.
- **페르소나는 저절로 유지되지 않는다.** 시스템 프롬프트만 준 챗봇 둘을 대화시키면
  8라운드 안에 말투가 눈에 띄게 무너지고 서로의 페르소나를 흡수한다(arXiv 2402.10962).
  1:1에서 잘하던 캐릭터도 그룹에서는 무너지고, 참가자가 늘수록 나빠진다(SocialBench,
  arXiv 2403.13679). 모델을 키운다고 좋아지지 않는다(PersonaGym, arXiv 2407.18416).
- **적정 인원은 작다.** 모델 하나가 여러 페르소나를 연기하는 실험은 인원을 늘리면
  올라갔다 꺾이는 역U 곡선을 그리고 8명에서는 크게 나빠지며, 토큰은 인원에 대해 거의
  제곱으로 는다(arXiv 2606.00655). 토론 계열 연구들도 3~4명에서 이득이 멈춘다. 실전
  권고 2~4명과 일치한다.
- **실패는 조정 실패다.** 멀티 에이전트 시스템 실패 1,600건을 분류한 MAST(arXiv
  2503.13657)에서 실패의 약 42%가 역할과 지시 위반, 약 37%가 에이전트 간 엇갈림(서로
  무시, 반복, 탈선, 끝낼 줄 모름)이었다. 역할 명세를 조이는 개입의 효과는 있으나
  크지 않았다. 구조적 안전장치(상한, 반복 감지, 발화 경계 자르기)를 1급 기능으로 두라는
  뜻으로 읽는다.

## 이 스택에서 확인한 것

이 프로젝트가 고정한 버전(`ai@7.0.58`, `@ai-sdk/react@4.0.61`)으로 스트림 동작을 실제로
실행해 확인했다.

- **되는 것**: 서버가 `createUIMessageStream`의 writer로 발화자 표시용 `data-*` part를
  쓰고, 이어서 각 캐릭터의 `streamText()` 결과를 `sendStart: false, sendFinish: false`로
  merge하면, 사용자 메시지 1건에 대한 응답 1개 안에 여러 캐릭터의 발화가 순서대로
  흐른다. 클라이언트는 `message.parts`를 발화자 part 경계에서 잘라 캐릭터별 말풍선으로
  그리면 된다. 3인 발화(Luna, Rex, Luna)가 중복 없이 정확히 나뉘는 것을 확인했다.
- **안 되는 것**: 응답 1개에 assistant 메시지 여러 개를 담는 방식(`start` part를 여러 번
  보내거나, 발화마다 요청을 다시 보내며 서버 `messageId`를 새로 주는 방식)은 앞 발화자의
  본문이 다음 메시지에 중복되는 확인된 버그가 있다(vercel/ai#8227, 조사일 기준 미해결).
  이 버그가 고쳐지기 전에는 "응답 1개 = UIMessage 1개 + 발화자 part 경계" 구도를
  기본으로 삼아야 한다.
- **메시지 metadata 방식**: 발화 사이에 사용자 메시지가 끼는 보통의 흐름에서는 응답마다
  `message.metadata`에 발화자를 담는 방식도 깨끗하게 동작한다. 요청 1건에 발화 1개일
  때의 대안이다.
- **경계 조건**: 여러 발화를 한 응답에서 만드는 만큼 Vercel Functions의 실행 시간 제한
  안에 라운드 상한이 들어와야 한다. 진행자 호출을 쓴다면 저렴한 모델로 분리할 수 있는데,
  현재 모델 설정은 `AI_GATEWAY_MODEL` 하나라 설정 확장이 필요하다. 서버 오케스트레이션은
  현재 [AI 서버 경계](../../decisions/ai-server-boundary.md)와
  [AI 모델 라우팅](../../decisions/ai-model-routing.md) 결정과 충돌 없이 얹을 수 있다.
- **다시 열리는 조건**: vercel/ai#8227이 해결되거나 AI SDK가 다중 발화(멀티 에이전트)
  스트림을 1급으로 지원하면 메시지 경계 설계를 다시 검토한다.

## 트레이드오프

| 선택 | 갈래 | 얻는 것 | 잃는 것 |
| --- | --- | --- | --- |
| 페르소나 실행 | 발화자별 호출 | 깨끗한 목소리 분리, 캐릭터별 통제 | 호출 수와 비용 증가, 서로의 설정을 모름 |
| | 병합 호출(한 호출이 전원 연기) | 비용 절감, 하나의 문맥 | 목소리 섞임, 역U 품질 곡선, 통제 약화 |
| 발화자 선택 | 규칙만(멘션, 순서, 풀) | 공짜, 예측 가능 | 결국 부자연스럽다는 불만 누적 |
| | LLM 진행자 | 자연스러운 흐름, 검증된 품질 향상 | 라운드마다 호출 1회 추가, 지연 |
| AI끼리 대화 | 없음(사용자 메시지당 응답만) | 비용과 폭주 통제 | 생동감 감소 |
| | 상한부 허용(사용자 입력 없이 1~2회) | 받아치는 재미 | 비용 증가, 상한과 중단 장치 필수 |
| 전송 형태 | 응답 1개에 발화 여러 개 | 함수 호출 1번, 검증된 패턴 | 실행 시간 제한 안에서만, 발화 단위 재시도 어려움 |
| | 발화마다 요청 1개 | 발화 단위 제어와 재시도 | 현 버전 중복 버그, 왕복과 대화록 재전송 증가 |
| 진행자와 캐릭터 모델 | 하나로 통일 | 설정 단순 | 진행자에게 과한 비용 |
| | 역할별 분리(진행자는 저렴한 모델) | 비용 절감 | 모델 설정 확장 필요 |

## 수용 가능한 요구사항

지금까지의 근거로 볼 때, 첫 버전에서 받아들여도 되는 요구의 윤곽이다.

- 상황(시나리오) 하나를 방이 소유하고, 그 안에서 페르소나 2~4명이 참여한다.
- 사용자 메시지 1건에 AI 응답은 기본 1~2건, 명시된 상한이 있다.
- 이름을 지목하면 그 캐릭터가 반드시 답한다. 지목이 없으면 규칙과(필요하면) 진행자가
  다음 발화자를 정한다.
- 발화는 한 번에 한 명씩 순차 스트리밍한다. 다음 차례 표시(누가 입력 중인지)를 보여 줄
  수 있다.
- AI끼리 이어 말하기는 사용자 입력 없이 최대 1~2회 같은 상한 안에서만 한다. 사용자가
  입력을 시작하면 멈춘다.
- 캐릭터별 음소거와 강제 발화 같은 통제 수단을 둔다(첫 버전 범위는 셰이핑에서 정한다).
- 대화는 현행 결정대로 메모리에만 둔다. 다자간이 저장을 요구하게 되면
  [AI 채팅 프로토콜](../../decisions/ai-chat-protocol.md)의 재검토 조건을 연다.
- 기능의 가치는 여러 관점과 역할극 경험으로 정당화한다. 정확도 향상을 약속하지 않는다.

## 미루거나 받지 않는 것이 좋은 요구사항

- 5명 이상의 대규모 캐스트: 품질과 비용 근거 모두가 반대한다.
- 동시 병렬 발화: 순차 생성이 업계 표준이고, 인과가 깨진다.
- 무제한 자율 대화(사용자 없이 계속 이어지는 방): 폭주와 비용의 원인이며, 모든 제품이
  상한과 지연을 단 opt-in으로만 제공한다.
- 페르소나별 비밀 정보(캐릭터마다 다른 문맥 가시성): 성숙한 오픈소스도 못 푼 고급
  기능이다. 공유 대화록 하나로 시작한다.
- 그룹과 1:1 사이의 기억 공유: 격리가 업계 기본값이다. 지금은 저장 자체가 없으므로
  자연히 제외된다.
- 여러 사용자 참여: 이 검토의 범위 밖이고, 인증과 실시간 동기화라는 별개의 문제를
  끌고 들어온다.
- "여럿이 상의하니 더 정확한 답": 근거가 반대 방향이다. 마케팅 문구로도 쓰지 않는다.

## 남은 결정

셰이핑에서 정해야 스펙을 쓸 수 있는 질문들이다.

1. **이 기능은 무엇을 위한 것인가.** 어떤 "특정 상황"에서 누구(어떤 페르소나들)가
   모이는가. 역할극과 이야기인가, 여러 관점의 조언 패널인가, 토론 관전인가. 이 답이
   페르소나 정의 주체, 말투, 통제 수단의 우선순위를 모두 결정한다.
2. 페르소나는 제품이 미리 정하는가, 사용자가 만드는가.
3. AI끼리 이어 말하기를 첫 버전에 넣는가, 사용자 메시지당 응답으로 한정하는가.
4. 기존 1:1 채팅 화면과의 관계(별도 진입인가, 같은 화면의 확장인가).
5. 메시지 동작(수정, 다시 받기)을 다자간에서 어떻게 재정의하는가.

## 근거

조사에 쓴 1차 출처. 각 항목은 본문 주장의 근거다.

### 프레임워크

- Vercel AI SDK 문서: [Building Agents](https://ai-sdk.dev/docs/agents/building-agents),
  [Workflow patterns](https://ai-sdk.dev/docs/agents/workflows),
  [Message metadata](https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata),
  [Streaming data(data parts)](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data),
  [Stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol),
  [멀티스텝 응답 결합 예제](https://ai-sdk.dev/cookbook/next/stream-text-multistep)
- 확인된 상류 버그: [vercel/ai#8227 스트리밍 응답의 message parts 중복](https://github.com/vercel/ai/issues/8227)
- AutoGen 0.4+: [Teams](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html),
  [SelectorGroupChat](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html),
  [Swarm](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/swarm.html),
  [Human-in-the-loop](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/human-in-the-loop.html)
- AG2: [Group chat patterns](https://docs.ag2.ai/latest/docs/user-guide/advanced-concepts/orchestration/group-chat/patterns/)
- Semantic Kernel: [AgentGroupChat(보관됨)](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-chat),
  [GroupChatOrchestration](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/group-chat)
- LangGraph: [langgraph-supervisor](https://github.com/langchain-ai/langgraph-supervisor-py),
  [langgraph-swarm](https://github.com/langchain-ai/langgraph-swarm-py),
  [멀티 에이전트 벤치마크(vendor 블로그)](https://www.langchain.com/blog/benchmarking-multi-agent-architectures)
- OpenAI Agents SDK: [Multi-agent](https://openai.github.io/openai-agents-python/multi_agent/),
  [Handoffs](https://openai.github.io/openai-agents-python/handoffs/),
  [AI SDK 어댑터(JS)](https://openai.github.io/openai-agents-js/extensions/ai-sdk/)
- Anthropic: [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents),
  [How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system)

### 제품

- SillyTavern: [Group Chats 문서](https://docs.sillytavern.app/usage/core-concepts/groupchats/),
  이슈 [#1211(목소리 섞임)](https://github.com/SillyTavern/SillyTavern/issues/1211),
  [#4527(캐릭터별 문맥 가시성)](https://github.com/SillyTavern/SillyTavern/issues/4527),
  [discussion #4130(LLM 진행자 요구)](https://github.com/SillyTavern/SillyTavern/discussions/4130)
- ChatGPT 그룹 채팅: [OpenAI 도움말(종료 공지 포함)](https://help.openai.com/en/articles/12703475-group-chats-in-chatgpt),
  [TechCrunch 출시 보도](https://techcrunch.com/2025/11/14/chatgpt-launches-pilot-group-chats-across-japan-new-zealand-south-korea-and-taiwan/)
- Character.AI: [그룹 채팅 발표](https://blog.character.ai/new-feature-announcement-character-group-chat/),
  [출시 구조 보도](https://www.maginative.com/article/character-ai-introduces-new-group-chats-feature/)
- Poe: [멀티 봇 발표(X)](https://x.com/poe_platform/status/1779898268174168511)
- Shapes: [그룹 채팅 가이드(Free Will 단계)](https://docs.shapes.inc/shapeschatsguide),
  [Discord 퇴출 보도](https://techissuestoday.com/shapes-inc-removed-from-discord-reactions/)
- Kindroid: [Groupchats 문서](https://kindroid.ai/v2/docs/groupchats/)
- Meta AI: [WhatsApp 그룹의 @Meta AI](https://faq.whatsapp.com/203220822537614),
  [셀럽 페르소나 폐지 보도](https://www.socialmediatoday.com/news/meta-retires-celebrity-styled-ai-bots/722974/)

### 연구

- 실패 분류 MAST: [arXiv 2503.13657](https://arxiv.org/abs/2503.13657) (2025)
- 토론 효과와 재검증: [arXiv 2305.14325](https://arxiv.org/abs/2305.14325) (2023),
  [arXiv 2311.17371](https://arxiv.org/abs/2311.17371) (2024),
  [arXiv 2502.08788](https://arxiv.org/abs/2502.08788) (2025),
  [arXiv 2509.05396](https://arxiv.org/abs/2509.05396) (2025)
- 페르소나 드리프트: [arXiv 2402.10962](https://arxiv.org/abs/2402.10962) (2024),
  [SocialBench, arXiv 2403.13679](https://arxiv.org/abs/2403.13679) (2024),
  [PersonaGym, arXiv 2407.18416](https://arxiv.org/abs/2407.18416) (2024)
- 발화 순서: [arXiv 2412.04937](https://arxiv.org/abs/2412.04937) (2024, Frontiers in AI 2025),
  [Inner Thoughts, arXiv 2501.00383](https://arxiv.org/abs/2501.00383) (CHI 2025),
  [회의 발화자 예측, arXiv 2606.17542](https://arxiv.org/html/2606.17542v1) (2026)
- 인원과 비용 곡선: [단일 모델 다중 페르소나, arXiv 2606.00655](https://arxiv.org/html/2606.00655v1) (2026),
  [More Agents Is All You Need, arXiv 2402.05120](https://arxiv.org/abs/2402.05120) (2024),
  [Are More LLM Calls All You Need?, arXiv 2403.02419](https://arxiv.org/abs/2403.02419) (2024)
- 시뮬레이션 캐릭터: [Generative Agents, arXiv 2304.03442](https://arxiv.org/abs/2304.03442) (2023)
- 역할극 두 에이전트의 실패 방식: [CAMEL, arXiv 2303.17760](https://arxiv.org/abs/2303.17760) (2023)
