# 센드베이스 게시글 플러그인

네이버 카페와 SOOP 글쓰기 자동화를 위한 Chrome Extension입니다.  
외부 SaaS(예: Sendbase)에서 전달한 데이터로 글쓰기 페이지를 열고 제목/본문(텍스트+스타일+이미지)을 자동 입력합니다.

## 1) 지원 기능

- 네이버 카페: `clubId`, `menuname`, `subject`, `contentHtml` 기반 자동 작성
- SOOP: `userid`, `boardId`, `subject`, `contentHtml` 기반 자동 작성
- 네이버 카페/SOOP 글쓰기 URL 자동 진입
- 글쓰기 탭 백그라운드 오픈(`active: false`)
- 게시판 자동 선택
- 본문 HTML 주입(허용 태그/스타일만 정규화 후 반영)
- 본문 중간 이미지 삽입
- `data:image/...;base64,...` 형태 지원
- `https://...` URL 이미지 지원(확장 background에서 다운로드 후 업로드)
- 옵션으로 등록 버튼 자동 클릭 가능
- 등록/게시 완료 후 글쓰기 탭 자동 닫기 가능

## 2) 설치 방법 (외부 개발자)

1. 이 저장소 코드를 로컬에 받습니다.
2. Chrome에서 `chrome://extensions` 접속
3. 우측 상단 `개발자 모드` ON
4. `압축해제된 확장 프로그램을 로드합니다` 클릭
5. 프로젝트 폴더를 선택합니다.

참고:
- 확장 이름은 `센드베이스 게시글 플러그인`입니다.
- `manifest.json` 변경 후에는 반드시 확장을 새로고침하세요.

## 3) 수동 실행 (팝업)

확장 아이콘 클릭 후 아래 필드 입력:

- `clubId`: 카페 ID (예: `28034021`)
- `menuname`: 게시판명 (UI 표기 텍스트와 일치 권장)
- `subject`: 글 제목
- `contentHtml`: 본문 HTML(비워도 실행 가능, 빈 본문으로 처리)
- `등록 버튼까지 자동 클릭`: 필요 시 체크

SOOP은 아래 payload를 사용합니다.

- `platform`: `soop` (선택, `userid`와 `boardId`가 있으면 자동 판별)
- `userid`: SOOP 방송국 사용자 ID
- `boardId`: SOOP 게시판 ID (`boardid`, `board_id`도 허용)
- `subject`: 글 제목
- `contentHtml`: 본문 HTML
- `submit`: `true`면 게시 버튼 자동 클릭
- `autoClose`: `true`면 자동 작성 성공 후 글쓰기 탭 닫기 (`submit=true`일 때는 기본 `true`)

## 4) SaaS 연동

이 확장은 아래 경로로 SaaS와 통신합니다.

`글쓰기 탭(active:false)` -> `chrome.runtime.sendMessage` -> `background.js` -> `chrome.tabs.sendMessage` -> `외부 SaaS 탭(content.js)` -> `window.postMessage` -> `외부 SaaS 웹앱`

현재 `manifest.json` 기준 content script 매칭:

```json
{
  "content_scripts": [
    { "matches": ["https://cafe.naver.com/ca-fe/cafes/*/articles/write*"], "js": ["example.js"] },
    { "matches": ["https://www.sooplive.com/station/*/post/write/*"], "js": ["example.js"] },
    { "matches": ["https://sendbase.workbase.im/*"], "js": ["content.js"] },
    { "matches": ["http://localhost:3001/*"], "js": ["content.js"] }
  ]
}
```

다른 SaaS 도메인에서 사용하려면 `manifest.json > content_scripts.matches`에 해당 도메인을 추가해야 합니다.

### 4-0. Extension 설치 여부 체크

SaaS에서 아래 메시지를 보내면, 확장이 설치되어 있고 현재 페이지에 브리지가 로드된 경우 설치 응답을 받습니다.

요청:

```js
window.postMessage(
  {
    source: "SENDBASE_SAAS",
    type: "SENDBASE_EXTENSION_CHECK",
    requestId: crypto.randomUUID()
  },
  window.location.origin
);
```

응답:

```js
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.type !== "SENDBASE_EXTENSION_CHECK_RESULT") return;

  console.log("installed:", data.installed); // true
  console.log("version:", data.version); // 예: "1.0.0"
});
```

### 4-1. SaaS -> Extension 요청 메시지

네이버 카페:

```js
window.postMessage(
  {
    source: "SENDBASE_SAAS",
    type: "SENDBASE_NAVER_CAFE_AUTOWRITE",
    requestId: crypto.randomUUID(),
    payload: {
      clubId: "28034021",
      menuname: "공지사항",
      subject: "자동 작성 테스트",
      contentHtml: "<p>안녕하세요</p>",
      submit: false,
      autoClose: false
    }
  },
  window.location.origin
);
```

SOOP:

```js
window.postMessage(
  {
    source: "SENDBASE_SAAS",
    type: "SENDBASE_SOOP_AUTOWRITE",
    requestId: crypto.randomUUID(),
    payload: {
      platform: "soop",
      userid: "ye3873",
      boardId: "123362015",
      subject: "자동 작성 테스트",
      contentHtml: "<p>안녕하세요</p>",
      submit: false,
      autoClose: false
    }
  },
  window.location.origin
);
```

참고:
- 요청 직후에는 "접수(accepted)"만 처리됩니다.
- 실제 자동화 결과는 아래 `4-2`, `4-3` 이벤트로 비동기 전달됩니다.
- 공통 요청 타입 `SENDBASE_AUTOWRITE`도 사용할 수 있습니다. 이 경우 결과 타입은 `SENDBASE_AUTOWRITE_RESULT`입니다.
- `submit=true`면 등록/게시 완료 URL 확인 후 글쓰기 탭이 기본으로 닫힙니다. 닫지 않으려면 `autoClose: false`를 전달하세요.
- `submit=false`에서도 자동 입력 직후 닫고 싶으면 `autoClose: true`를 전달하세요. 이 경우 수동 등록은 할 수 없습니다.

### 4-2. Extension -> SaaS 결과 메시지

성공/실패와 관계없이 아래 형태로 응답을 받습니다.

```js
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || ![
    "SENDBASE_NAVER_CAFE_AUTOWRITE_RESULT",
    "SENDBASE_SOOP_AUTOWRITE_RESULT",
    "SENDBASE_AUTOWRITE_RESULT"
  ].includes(data.type)) return;

  console.log("requestId:", data.requestId);
  console.log("result:", data.result);
  // result 예시:
  // { ok: true, message: "자동 입력이 완료되었습니다. 등록 버튼은 수동으로 눌러 주세요." }
  // { ok: false, error: "clubId, menuname, subject는 필수입니다." }
});
```

### 4-3. 등록 완료 URL 추가 메시지 (`submit=true`)

`submit=true`로 등록 버튼 클릭까지 자동화한 경우, 등록 완료 화면으로 이동하면 URL을 한 번 더 전달합니다.

```js
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || ![
    "SENDBASE_NAVER_CAFE_AUTOWRITE_COMPLETED_URL",
    "SENDBASE_SOOP_AUTOWRITE_COMPLETED_URL",
    "SENDBASE_AUTOWRITE_COMPLETED_URL"
  ].includes(data.type)) return;

  console.log("requestId:", data.requestId);
  console.log("completedUrl:", data.url);
});
```

참고:
- 완료 URL 탐지는 글쓰기 페이지에서 다른 URL로 이동하는 시점을 기준으로 수행합니다.
- 네트워크/페이지 상태에 따라 완료 URL 탐지가 지연되면 `result.completedUrlError`가 함께 올 수 있습니다.

### 4-4. 요청/응답 구현 예시

```js
const requestId = crypto.randomUUID();

window.postMessage(
  {
    source: "SENDBASE_SAAS",
    type: "SENDBASE_NAVER_CAFE_AUTOWRITE",
    requestId,
    payload: {
      clubId: "28034021",
      menuname: "공지사항",
      subject: "자동 작성 테스트",
      contentHtml: "<p>안녕하세요</p>",
      submit: true
    }
  },
  window.location.origin
);

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== "SENDBASE_EXTENSION") return;
  if (data.requestId !== requestId) return;

  if (data.type === "SENDBASE_NAVER_CAFE_AUTOWRITE_RESULT") {
    console.log("자동화 결과:", data.result);
  }

  if (data.type === "SENDBASE_NAVER_CAFE_AUTOWRITE_COMPLETED_URL") {
    console.log("완료 URL:", data.url);
  }
});
```

## 5) API 입력 스펙

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `platform` | string | N | `naver_cafe` 또는 `soop`. 미입력 시 payload 필드로 자동 판별 |
| `clubId` | string | 네이버 Y | 네이버 카페 ID |
| `menuname` | string | 네이버 Y | 게시판 이름 |
| `userid` | string | SOOP Y | SOOP 방송국 사용자 ID |
| `boardId` | string | SOOP Y | SOOP 게시판 ID |
| `subject` | string | Y | 글 제목 |
| `contentHtml` | string | N | 본문 HTML (미입력 시 빈 본문) |
| `submit` | boolean | N | `true`면 등록/게시 버튼 자동 클릭 |
| `autoClose` | boolean | N | `true`면 자동화 성공 후 글쓰기 탭 닫기. 기본값은 `submit=true`일 때 `true`, 그 외 `false` |

## 6) contentHtml 작성 가이드

권장 태그:
- 블록: `p`, `div`, `blockquote`, `h1~h6`, `ul`, `ol`, `li`
- 인라인: `b/strong`, `i/em`, `u`, `s/strike/del`, `span`, `a`

스타일 허용 범위:
- `color`, `font-size`, `font-weight`, `font-style`, `text-decoration`, `text-align`
- 그 외 스타일/속성은 제거되거나 변환될 수 있습니다.

이미지 처리 규칙:
- `<img>`는 최상위 노드 또는 문단 내부에 넣을 수 있습니다.
- 문단 내부 이미지도 자동으로 앞뒤 텍스트와 분리되어 별도 줄에 업로드됩니다.
- 권장: `<p>문단</p><img ... /><p>다음 문단</p>`
- 허용: `<p>문단 <img ... /> 다음 문단</p>`

### 예시 (URL 이미지)

```html
<p>첫 문단입니다.</p>
<img src="https://example.com/image1.jpg" alt="image1" />
<p>이미지 뒤 문단입니다.</p>
```

### 예시 (Base64 이미지)

```html
<p>첫 문단입니다.</p>
<img src="data:image/png;base64,iVBORw0KGgoAAA..." data-filename="photo1" />
<p>이미지 뒤 문단입니다.</p>
```

## 7) 동작 조건 및 제한

- 네이버 또는 SOOP 로그인 상태가 아니면 자동화가 실패합니다.
- 카페/방송국 게시판 글쓰기 권한이 있어야 합니다.
- 네이버/SOOP 에디터 DOM 변경 시 셀렉터 보정이 필요할 수 있습니다.
- 이미지 URL은 접근 가능한 공개 URL이어야 합니다.
- 일부 사이트의 hotlink 차단/CORS 정책으로 URL 이미지 변환이 실패할 수 있습니다.

## 8) 문제 해결

- 증상: 게시판 선택이 안 됨
- 조치: `menuname`을 UI 표기와 완전히 동일하게 전달

- 증상: 스타일/줄바꿈이 깨짐
- 조치: `contentHtml`이 이중 인코딩(`&lt;p&gt;`) 상태인지 확인

- 증상: URL 이미지가 실패함
- 조치: 해당 URL이 브라우저에서 직접 열리는지 확인, hotlink 차단 여부 확인

## 9) 권한(Manifest)

- `permissions`: `tabs`, `scripting`
- `host_permissions`
- `https://cafe.naver.com/*`
- `https://www.sooplive.com/*`
- `https://*/*`
- `http://*/*`

외부 이미지 URL 다운로드를 위해 광범위 host permission을 사용합니다. 운영 배포 시에는 실제 필요 도메인으로 축소하는 것을 권장합니다.
