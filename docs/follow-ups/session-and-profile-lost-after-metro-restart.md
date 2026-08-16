# Metro를 다시 띄운 뒤 로그인 상태와 프로필이 사라진다

**Symptom**: 온보딩을 끝낸 계정이 개발 세션 재시작 뒤 로그인 화면으로 돌아가고, 같은 주소로 다시 로그인하면 이미 정한 닉네임과 아이디를 또 물어본다.

**Observed evidence**: 2026-08-16 iOS Simulator의 Development Build에서 확인했다. `agent-20260816-03@example.test`로 로그인해 닉네임 `히트영역`과 아이디 `agent2026081603`을 저장하고 홈 탭까지 들어갔다. `bun run dev:stop` 뒤 `bun run dev ios`로 세션을 다시 띄우자 앱이 로그인 화면으로 열렸다. 같은 주소로 인증 코드를 다시 받아 로그인하니 닉네임 화면이 다시 나왔고, 앞서 쓴 것과 같은 아이디 `agent2026081603`이 그대로 제안되고 받아들여졌다.

**Suspected cause**: 저장된 Supabase 세션을 다시 읽지 못했거나, 프로필 행이 저장되지 않았는데 온보딩이 끝난 것처럼 화면만 넘어간 것으로 보인다. 둘 중 어느 쪽인지는 확인하지 않았다.

**What was tried**: 같은 세션의 앞부분에서 `What` / `helpme2183` 계정은 앱 재실행과 `agent-device open --relaunch`를 여러 번 거치고도 로그인 상태를 유지했다. 그래서 앱 재실행 자체가 원인은 아니다. 이번 작업은 계정 삭제와 로그아웃의 진행 표시만 바꿨고 인증이나 프로필 저장 경로는 건드리지 않았다.

**프로필 저장은 아님**: 2026-08-17에 온보딩을 마친 계정 넷을 로컬 데이터베이스에서 확인했다. `otpbug-ios-01`, `otpbug-ios-02`, `otpbug-ios-03`, `otpbug-and-01` 모두 `public.profiles` 행에 `display_name`과 `username`이 들어 있었다. 온보딩을 끝내지 않은 `otpbug-ios-04`와 `otpbug-and-02`만 두 값이 비어 있었다. 저장 경로는 정상이므로 남은 원인은 세션 복원이다.

**Proposed next step**: 개발 세션 재시작이 앱 저장소를 지우는지 본다. 온보딩을 마친 뒤 `expo-secure-store`에 Supabase 세션이 들어 있는지 확인하고, `bun run dev:stop` 뒤 `bun run dev ios`로 다시 띄운 다음 같은 값이 남아 있는지 비교한다. 값이 사라지면 개발 세션이, 남아 있는데도 로그인 화면이 열리면 세션 복원 코드가 원인이다.
