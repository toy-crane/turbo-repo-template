# 플랫폼을 더할 때 네이티브 빌드가 실행 중인 Metro 아래에서 돈다

**Symptom**: 한 worktree에서 iOS 세션이 돌고 있을 때 `bun run dev android`를 실행하면, Android Development Build가 iOS Metro와 `apps/mobile` node_modules를 살아 있는 채로 두고 진행한다. 실행 중이던 iOS 앱이 빌드 도중 어떤 영향을 받는지 아직 확인하지 않았다.

**Observed evidence**: `scripts/dev/adapters/expo.ts`의 `runDevBuild`는 매번 `expo prebuild --platform <플랫폼> --clean`을 먼저 실행하고, `--no-install`을 넘기지 않아 패키지 설치 단계도 함께 지난다. `apps/mobile/.gitignore`가 `/ios`와 `/android`를 제외하므로 이 저장소는 네이티브 폴더를 매번 다시 만드는 구성이다. 플랫폼 누적 실행을 넣기 전에는 다른 플랫폼을 요청하면 세션을 먼저 내렸기 때문에, 이 저장소의 Metro가 살아 있는 상태에서 `runDevBuild`가 돈 적이 없다.

**Suspected cause**: `prebuild --clean`이 네이티브 폴더를 지우고 다시 만들고 패키지를 다시 설치하는 동안, 같은 프로젝트를 지켜보는 Metro가 사라졌다 나타나는 파일과 바뀐 `node_modules`를 읽을 수 있다. 이 저장소에는 Metro가 이전 `expo-router` 버전을 계속 쓴 기록이 이미 있어서, 설치 중 상태를 읽으면 같은 종류의 잘못된 결과가 나올 수 있다고 본다.

**What was tried**: 플랫폼 누적 실행을 그대로 두고, 실행 중인 API와 Metro가 살아 있는지 빌드 내내 확인하도록 `scripts/dev/session/start.ts`의 `join` 경로에 프로세스 감시를 넣었다. 세션이 빌드 도중 죽으면 앱 연결 실패 대신 프로세스 종료로 보고한다. 빌드가 실행 중인 Metro의 캐시나 `node_modules`에 주는 영향 자체는 그대로 남아 있다.

**Proposed next step**: iOS 세션을 띄운 상태에서 Android Development Build를 새로 만들고, 빌드 도중과 직후 iOS 앱의 번들이 정상인지 확인한다. 문제가 재현되면 `join` 경로에서 새 빌드가 필요할 때만 API와 Metro를 먼저 내리고 빌드가 끝난 뒤 두 플랫폼을 함께 다시 여는 방식을 검토한다. 이 경로는 이미 `restart` 계획에 구현돼 있다.
