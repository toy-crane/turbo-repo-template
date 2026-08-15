# 병렬 worktree 첫 실행에서 native fingerprint가 한 번 달라진다

**Symptom**: 같은 커밋과 Android 개발 환경에서 첫 개발 세션이 계산한 native
fingerprint와 다음 실행이 계산한 값이 한 번 달랐다. 두 값이 서로 다른 공용 빌드
경로를 가리켜 두 번째 실행이 방금 만든 APK 대신 기존 공용 APK를 다시 설치했다.

**Observed evidence**: 2026-08-16에 커밋 `1e97781`의 임시 iOS·Android
worktree에서 Bun 1.3.6으로 `bun install --frozen-lockfile`을 동시에 마친 뒤 두
플랫폼을 동시에 시작했다. Android 첫 실행은
`3728078f29ad6f613179d1fab9f017f0c43cc44a`를 계산해 새 APK를 만들었다. 같은
worktree의 다음 `bun run dev android --clear`는
`e3be504ba70282149a605ce8b64f03ff621cd46d`를 계산해 이미 있던 공용 APK를
설치했다. 이후 두 worktree에서 네 번씩 동시에 계산한 여덟 결과와 새 probe
worktree에서 계산한 결과는 모두 `e3be504ba70282149a605ce8b64f03ff621cd46d`였다.

**Suspected cause**: 두 worktree의 첫 의존성 설치와 Expo fingerprint 계산을
동시에 실행한 과정에서 설치된 네이티브 입력이나 autolinking 결과가 잠깐 달랐을 수
있다. `expo prebuild`가 만든 `apps/mobile/android` 폴더는 Git에서 무시되고 Expo가
CNG 입력에서 제외했으며, 폴더가 없는 worktree도 나중에는 같은 fingerprint를
계산했으므로 직접 원인으로 보이지 않는다.

**What was tried**: 현재 입력으로 fingerprint를 병렬 계산하고 새 worktree에
의존성을 다시 설치해 재현을 시도했다. 모두 같은 값을 냈고 iOS·Android 앱과 Metro
bundle은 정상 실행됐다. 반복하지 않는 현상에 맞춰 실행 코드에는 보정이나 재시도
로직을 넣지 않았다.

**Proposed next step**: 새 worktree 두 곳의 첫 병렬 설치부터 다시 재현하되, 각
`fingerprint:generate --debug` 결과를 첫 개발 세션 전과 native 빌드 직후에
보관한다. 값이 바뀌면 `fingerprint:diff`로 달라진 source를 찾고, Bun postinstall
결과와 Expo autolinking 결과 중 어느 입력이 흔들렸는지 확인한다.
