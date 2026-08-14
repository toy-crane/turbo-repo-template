# Bun이 Markdown 렌더러의 postinstall을 보지 못한다

**Symptom**: `react-native-enriched-markdown`이 네이티브 자산을 내려받는
`postinstall`을 선언하는데 `bun install`이 실행하지 않는다. `trustedDependencies`에
적어도 달라지지 않고, `bun pm trust`는 "실행할 스크립트가 없다"고 답한다. 자산이
없으면 코드 강조와 수식이 꺼진 채로 빌드가 성공하므로 아무 경고 없이 지나간다.

**Observed evidence**: Bun 1.3.6에서 빈 프로젝트로 확인했다. 스크립트가 실행되면
찍히는 문구를 표시로 삼았다.

| 구성 | 실행 |
| --- | --- |
| 워크스페이스 의존 + `trustedDependencies` | 안 됨 |
| 루트 직접 의존 + `trustedDependencies` | 안 됨 |
| `bun pm trust react-native-enriched-markdown` | 안 됨 |
| `node_modules`와 lockfile 삭제 후 재설치 | 안 됨 |
| `bun pm cache rm` 후 840개 새로 받기 | 안 됨 |
| 대조군 `esbuild` + `trustedDependencies` | 됨 |

선언 자체는 멀쩡하다. npm 레지스트리 메타데이터가 `hasInstallScript: true`와 함께
`scripts.postinstall`을 담고 있고, 설치된 `node_modules` 안 `package.json`에도
`"postinstall": "node postinstall.mjs"`가 있다. 손으로 실행하면 정상 동작한다.

**Suspected cause**: Bun 쪽 문제로 보인다. 같은 종류의 `postinstall`을 가진
`esbuild`는 같은 구성에서 실행되므로 메커니즘 자체는 동작한다. 두 패키지의 차이는
스크립트 개수다. `esbuild`는 `postinstall` 하나뿐이고 이 패키지는 `prepare`와
`prepack`을 포함해 18개를 갖는다. 이 패키지가 publish 시점에 `prepack`으로
`package.json`을 고쳐 쓰는 것과 관련이 있을 수 있으나 확인하지 못했다.

**What was tried**: 저장소 루트 `postinstall`에서
[scripts/setup/vendor-markdown-assets.ts](../../scripts/setup/vendor-markdown-assets.ts)가
라이브러리의 스크립트를 직접 실행한다. 이것으로 모든 설치가 같은 자산을 갖는다.
`apps/mobile`이 설치되지 않은 경우에는 건너뛰고 설치를 깨지 않는다. Bun이 스크립트를
보지 못하는 원인 자체는 그대로 남는다.

**Proposed next step**: Bun을 올릴 때 `trustedDependencies`만으로 되는지 다시
확인한다. 되면 루트 `postinstall`과 이 스크립트를 지운다. 계속 안 되면 최소 재현
프로젝트를 만들어 [oven-sh/bun](https://github.com/oven-sh/bun/issues)에 올린다.
스크립트가 18개인 패키지와 하나인 패키지를 나란히 둔 재현이면 충분하다.
