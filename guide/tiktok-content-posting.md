# TikTok 일괄 발행 구현 지침

이 문서는 Sendbase에 TikTok을 일괄 발행 대상으로 추가할 때 따라야 할 제품, API, 데이터, 보안 및 검증 기준을 정의한다. 구현자는 이 문서와 TikTok 공식 문서를 함께 기준으로 삼아야 한다.

## 1. 구현 범위와 핵심 원칙

1차 구현 범위는 TikTok Content Posting API의 **사진 Direct Post**로 제한한다.

- `post_mode`: `DIRECT_POST`
- `media_type`: `PHOTO`
- OAuth scope: `video.publish`
- 사진이 없는 텍스트 전용 TikTok 게시물은 허용하지 않는다.
- TikTok은 스레드형 플랫폼이 아니다. `threadReplies`는 Discord 업로드 시의 구현처럼 하나로 합친다.
- TikTok API 초기화 성공은 발행 완료가 아니다. `publish_id`를 받은 뒤 웹훅과 상태 폴링으로 최종 결과를 확인한다.
- TikTok 전용 UI와 관련 데이터 요청은 사용자가 TikTok을 발행 대상으로 선택한 동안에만 활성화한다.
- 별도의 TikTok 미리보기 화면은 만들지 않는다. 사용자가 작성 중인 공통 편집기와 이미지 순서가 게시될 콘텐츠를 확인하는 화면 역할을 한다.

`MEDIA_UPLOAD`는 TikTok 받은편지함으로 전송한 뒤 사용자가 TikTok 앱에서 게시를 완료하는 흐름이므로, Sendbase의 일괄 발행 완료 의미와 맞지 않는다. 1차 구현에 포함하지 않는다.

## 2. 공식 문서 기준

구현 전후에 다음 공식 문서를 확인한다.

- [Content Posting API 제품 개요](https://developers.tiktok.com/products/content-posting-api)
- [사진 게시물 API](https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post)
- [Creator Info 조회](https://developers.tiktok.com/docs/en/content-posting-api-reference-query-creator-info)
- [미디어 전송 및 이미지 제한](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide)
- [게시 상태 조회와 Content Posting 웹훅](https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status)
- [Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines)
- [사용자 액세스 토큰 관리](https://developers.tiktok.com/docs/en/oauth-user-access-token-management)
- [웹훅 서명 검증](https://developers.tiktok.com/docs/en/webhooks-verification)
- [웹훅 전달 정책](https://developers.tiktok.com/docs/en/webhooks-overview)

TikTok 문서의 스키마, 제한 또는 심사 정책이 이 문서와 달라진 경우 TikTok 공식 문서를 우선하고, 코드·테스트·이 문서를 함께 갱신한다.

## 3. 전체 사용자 흐름

### 3.1 TikTok을 선택하지 않은 경우

- TikTok 전용 컴포넌트를 렌더링하거나 미리 마운트하지 않는다.
- Creator Info를 호출하지 않는다.
- TikTok 전용 상태를 폼 검증이나 공통 발행 요청에 포함하지 않는다.
- 기존 플랫폼의 편집과 발행 흐름에 변화가 없어야 한다.

### 3.2 TikTok을 선택한 경우

1. TikTok 전용 설정 컴포넌트를 동적으로 불러와 마운트한다.
2. 서버를 통해 최신 Creator Info를 조회한다.
3. 연결된 TikTok 계정 닉네임과 사용 가능한 공개 범위를 표시한다.
4. 사용자가 TikTok 제목, 공개 범위, 댓글, 음악, 커버, 상업 콘텐츠, AIGC 및 동의 항목을 직접 설정한다.
5. 공통 편집기에 이미지가 없으면 발행 버튼을 비활성화하고 이유를 표시한다.
6. 사용자가 최종 발행을 명시적으로 실행한 뒤에만 TikTok으로 콘텐츠 전송을 시작한다.

TikTok 선택이 해제되면 전용 UI를 언마운트한다. 임시 TikTok 옵션은 기본적으로 폐기하여, 다시 선택했을 때 이전 공개 범위나 동의가 자동 적용되지 않게 한다. 특히 공개 범위는 기본값을 두어서는 안 된다.

### 3.3 별도 미리보기를 만들지 않는 기준

공통 편집기가 다음 정보를 사용자가 발행 전 확인할 수 있게 표시하므로 별도 TikTok 미리보기는 만들지 않는다.

- 실제 발행할 본문
- 실제 발행할 이미지와 순서
- 공통 제목

TikTok 설정 UI에는 콘텐츠를 다시 렌더링하지 않는다. 대신 계정, 공개 범위, 상호작용, 커버 및 고지 설정만 제공한다. 편집기의 텍스트나 이미지가 TikTok 전송 직전에 자동으로 추가·변경되어서는 안 된다.

## 4. TikTok 전용 UI 요구사항

TikTok 전용 UI는 큰 폼 전체를 Client Component로 바꾸지 않고, 기존 편집기의 상호작용 영역 안에 작은 Client Component로 분리한다. TikTok이 선택된 경우에만 `dynamic import` 또는 `lazy`로 불러온다.

필수 UI 항목은 다음과 같다.

- Creator Info가 반환한 `creator_nickname`
- TikTok용 제목
- 공개 범위 선택
- 댓글 허용
- 추천 음악 자동 추가
- 커버 이미지 선택
- 상업 콘텐츠 여부
- 내 브랜드 홍보 여부
- 제3자 브랜드 콘텐츠 여부
- AI 생성 이미지 여부
- TikTok Music Usage Confirmation 동의
- 브랜드 콘텐츠일 때 TikTok Branded Content Policy 동의

다음 기본 상태를 지킨다.

- 공개 범위: 미선택
- 댓글 허용: 선택하지 않음
- 추천 음악: 선택하지 않음
- 상업 콘텐츠: 꺼짐
- 내 브랜드 및 브랜드 콘텐츠: 선택하지 않음
- AIGC: 선택하지 않음
- 동의: 선택하지 않음

Creator Info의 `comment_disabled`가 `true`이면 댓글 허용 컨트롤을 비활성화한다. 사진 게시물에는 Duet과 Stitch가 적용되지 않으므로 해당 옵션을 표시하지 않는다.

상업 콘텐츠 토글이 켜지면 `내 브랜드`와 `브랜드 콘텐츠` 중 하나 이상을 선택해야 한다. `브랜드 콘텐츠`와 `SELF_ONLY`는 함께 선택할 수 없게 하고, 사용자가 이해할 수 있는 이유를 표시한다.

TikTok에 전달할 제목, description, hashtag와 이미지에는 Sendbase 홍보 문구, 로고 또는 watermark를 자동으로 추가하지 않는다. 모든 텍스트는 최종 발행 전에 공통 편집기 또는 TikTok 제목 입력에서 사용자가 수정할 수 있어야 한다.

## 5. 폼 데이터와 공통 스키마

클라이언트와 서버가 같은 Zod 스키마를 사용한다. 예시 타입은 다음 의미를 가져야 한다.

```ts
type TikTokPhotoPublishOptions = {
  title: string
  description: string
  privacyLevel:
    | "PUBLIC_TO_EVERYONE"
    | "MUTUAL_FOLLOW_FRIENDS"
    | "FOLLOWER_OF_CREATOR"
    | "SELF_ONLY"
  allowComment: boolean
  autoAddMusic: boolean
  brandContent: boolean
  brandOrganic: boolean
  isAigc: boolean
  photoCoverIndex: number
  musicUsageAccepted: boolean
  brandedContentPolicyAccepted: boolean
}
```

위 타입은 서버 검증을 통과한 발행용 타입이다. UI의 draft 상태에서는 `privacyLevel`을 `null`로 두어 기본값이 생기지 않게 하고, Zod parse 성공 후에만 위 타입으로 변환한다.

`privacyLevel` 타입이 전체 enum을 포함하더라도 실제 요청에서는 반드시 최신 Creator Info의 `privacy_level_options`에 포함된 값인지 다시 검증한다.

### 5.1 서버 검증 규칙

TikTok이 선택된 경우 Server Action에서 다음을 모두 재검증한다.

- 이미지 수가 1개 이상 35개 이하인지
- TikTok용 제목이 90 UTF-16 단위 이하인지
- description이 4,000 UTF-16 단위 이하인지
- 커버 인덱스가 `0 <= index < imageCount`인지
- 공개 범위가 비어 있지 않은지
- 공개 범위가 최신 Creator Info 옵션에 포함되는지
- Creator Info가 게시 제한 오류를 반환하지 않았는지
- `comment_disabled=true`인데 댓글 허용을 요청하지 않았는지
- 상업 콘텐츠가 켜진 경우 브랜드 유형이 하나 이상 선택되었는지
- 브랜드 콘텐츠와 `SELF_ONLY`가 동시에 선택되지 않았는지
- 필요한 동의가 모두 완료되었는지
- 이미지 URL이 현재 사용자가 소유한 Sendbase Storage 객체인지
- 이미지 URL이 TikTok에 검증한 URL prefix 아래에 있는지

JavaScript의 `string.length`는 UTF-16 code unit을 세므로 TikTok 제한 계산에 사용한다. 클라이언트 카운터와 서버 검증이 반드시 동일한 함수를 사용해야 한다.

Creator Info는 UI 렌더링 시 한 번 조회하고, 최종 Server Action에서도 다시 조회한다. 두 번째 호출은 사용자 입력 검증 및 공개 범위 변경 방지를 위한 보안 재검증이므로 제거하지 않는다.

## 6. TikTok 사진 요청 매핑

Direct Post 요청은 다음 형태로 매핑한다.

```json
{
  "media_type": "PHOTO",
  "post_mode": "DIRECT_POST",
  "post_info": {
    "title": "TikTok 전용 제목",
    "description": "공통 편집기에서 만든 평문 본문",
    "privacy_level": "사용자가 직접 선택한 값",
    "disable_comment": true,
    "auto_add_music": false,
    "brand_content_toggle": false,
    "brand_organic_toggle": false
  },
  "source_info": {
    "source": "PULL_FROM_URL",
    "photo_images": ["https://.../image.webp"],
    "photo_cover_index": 0
  },
  "is_aigc": false
}
```

매핑 규칙은 다음과 같다.

- `disable_comment = !allowComment`
- `brand_content_toggle = brandContent`
- `brand_organic_toggle = brandOrganic`
- `photo_images`는 공통 편집기 원문의 이미지 순서를 유지한다.
- `photo_cover_index`는 변환 후 이미지 배열 기준이다.
- `description`은 공통 HTML을 기존 평문 변환기로 변환한 결과를 사용한다.
- `threadReplies`의 텍스트나 이미지는 TikTok 요청에 포함하지 않는다.
- API 문서가 optional로 표시한 boolean도 의도가 불명확해지지 않도록 명시적으로 전송한다.

## 7. 이미지 정책과 Supabase URL prefix

### 7.1 이미지 제약

TikTok 사진 게시물은 다음을 만족해야 한다.

- JPEG 또는 WebP
- 이미지당 최대 20MB
- TikTok 문서 기준 최대 1080p
- 최대 35장
- 공개 HTTPS URL
- HTTP redirect 없이 직접 응답
- 다운로드가 완료될 때까지 접근 가능하며 최대 1시간 동안 유지

현재 Sendbase 업로드 상한 10MB는 TikTok의 20MB보다 작으므로 유지해도 된다. 다만 현재 이미지 파이프라인은 투명 이미지에 PNG를 사용하고 최대 폭 1600으로 변환하므로 TikTok 전용 파생본이 필요하다.

TikTok 파생본은 다음 기준으로 생성한다.

- 알파 채널이 필요하면 WebP, 그렇지 않으면 JPEG 또는 WebP
- EXIF 방향 보정
- 원본 비율 유지
- 가로형은 1920×1080, 세로형은 1080×1920 범위 안으로 축소하여 1080p를 넘기지 않음
- 애니메이션 GIF는 기존 정책과 동일하게 정적 첫 프레임으로 처리하거나 발행 전에 명확히 거부
- 변환 결과의 MIME, 실제 크기, width, height를 다시 확인
- 변환본도 현재 사용자 소유 경로 아래 저장

공식 문서의 `1080p` 정의가 변경되거나 더 구체화되면 변환 규칙과 fixture를 함께 갱신한다.

### 7.2 Supabase 기본 URL 사용

별도 미디어 도메인은 만들지 않는다. Supabase public Storage URL을 TikTok Developer Portal에서 **URL prefix 방식**으로 검증해 사용한다.

예시 prefix:

```text
https://<project-ref>.supabase.co/storage/v1/object/public/post-media/
```

설정 절차는 다음과 같다.

1. TikTok Developer Portal의 URL properties에서 URL prefix 검증을 선택한다.
2. 실제 운영 Supabase public bucket prefix를 등록한다.
3. TikTok이 제공하는 signature 파일을 해당 public prefix 아래에 업로드한다.
4. signature 파일 URL과 실제 이미지 URL이 인증 없이 `200`을 반환하는지 확인한다.
5. redirect가 발생하지 않는지 `HEAD`와 `GET`으로 확인한다.
6. TikTok용 파생본 URL이 등록한 prefix와 정확히 일치하는지 통합 테스트한다.

signed URL이나 만료가 짧은 URL은 사용하지 않는다. `photo_images`에는 public bucket의 직접 URL만 전달한다. URL을 요청 데이터에서 그대로 신뢰하지 말고, 서버에서 Supabase origin, bucket path, 사용자 ID path를 검증한 뒤 TikTok용 URL을 구성한다.

## 8. OAuth와 토큰 수명

TikTok 연결은 Web OAuth 2.0을 사용한다.

- Authorization URL: `https://www.tiktok.com/v2/auth/authorize/`
- Token URL: `https://open.tiktokapis.com/v2/oauth/token/`
- 필수 scope: `video.publish`
- CSRF 방지를 위한 무작위 `state` 생성 및 callback 검증
- authorization code 교환은 서버에서만 수행
- access token과 refresh token은 암호화하여 서버 DB에만 저장
- `client_secret`은 클라이언트 번들, 응답, 로그에 포함하지 않음

access token은 일반적으로 24시간, refresh token은 365일 유효하다. refresh 응답이 새로운 refresh token을 반환할 수 있으므로 access token, refresh token 및 만료 시간을 하나의 원자적 업데이트로 교체한다.

동시에 여러 발행이나 폴링 작업이 토큰을 갱신할 수 있으므로 연결 행 잠금 또는 compare-and-swap으로 refresh 경쟁을 막는다. `access_token_invalid` 응답 시에는 refresh를 한 번만 수행하고 원래 요청을 한 번만 재시도한다.

사용자가 TikTok 연결을 해제하면 `/v2/oauth/revoke/`를 호출한 뒤 로컬 연결 정보를 제거한다.

## 9. 데이터베이스 변경

기존 migration을 수정하지 말고 새 migration을 만든다.

```bash
supabase migration new add_tiktok_content_posting
```

최소 변경 사항은 다음과 같다.

### 9.1 enum

- `publish_platform`에 `tiktok` 추가
- `destination_status`에 `processing` 추가

집계용 `post_status`는 기존 `publishing`을 비동기 진행 상태로 사용해도 된다.

### 9.2 `post_destinations`

다음 정보를 저장할 수 있어야 한다.

- `publish_options jsonb`: 서버 검증을 통과한 TikTok 게시 옵션 snapshot
- `external_publish_id text`: TikTok `publish_id`
- `provider_status text`: TikTok 원본 상태
- `next_poll_at timestamptz`
- `last_polled_at timestamptz`
- `poll_attempt_count integer not null default 0`
- `requires_manual_review boolean not null default false`

TikTok `external_publish_id`에는 중복을 막는 partial unique index를 둔다. 공개 검수가 끝난 게시물 ID는 기존 `external_post_id`에, 공개 URL이 확정된 경우에만 `external_url`에 저장한다.

`publish_options`는 클라이언트 입력 원본이 아니라 서버 재검증을 통과한 값만 저장한다. access token, refresh token, Creator Info avatar URL 또는 민감한 API 원문 응답은 저장하지 않는다.

### 9.3 웹훅 중복 방지

웹훅은 at-least-once 방식이므로 처리한 이벤트를 식별할 수 있는 테이블 또는 안정적인 payload hash 기반 unique key를 둔다. 동일 이벤트가 다시 들어오면 성공 `200`을 반환하되 상태 변경은 반복하지 않는다.

마이그레이션 적용 후 다음을 수행한다.

```bash
supabase db push
```

그다음 Supabase TypeScript 타입을 다시 생성하여 `lib/database.types.ts`를 갱신한다.

## 10. 발행 오케스트레이션

### 10.1 외부 API 호출 전 preflight

일괄 발행을 시작하기 전에 모든 결정 가능한 오류를 확인한다.

1. 공통 폼과 플랫폼별 폼을 서버에서 검증한다.
2. TikTok 연결과 scope를 확인하고 필요하면 토큰을 갱신한다.
3. 최신 Creator Info를 조회해 사용자 선택을 다시 검증한다.
4. TikTok 이미지 파생본과 URL prefix를 확인한다.
5. 모든 destination을 DB에 생성한다.
6. destination을 원자적으로 claim한 작업만 외부 API를 호출한다.

Preflight에서 실패하면 다른 플랫폼도 발행하지 않는다. 외부 API 호출이 시작된 뒤 발생한 실패는 기존 `partial` 정책으로 기록한다.

### 10.2 TikTok 초기화

`POST /v2/post/publish/content/init/` 성공 시 다음처럼 처리한다.

- `publish_id` 저장
- destination 상태를 `processing`으로 변경
- `provider_status`에 초기 처리 상태 기록
- 첫 `next_poll_at` 설정
- 사용자에게 “TikTok에서 처리 중”으로 표시
- 아직 `published`로 변경하지 않음

TikTok 초기화에는 공식 idempotency key가 없으므로, 네트워크 timeout처럼 서버 수신 여부를 알 수 없는 실패를 자동 재시도하지 않는다. `requires_manual_review=true`로 기록하고 사용자가 TikTok 계정을 확인하기 전 재발행하지 못하게 한다. 확실한 validation 오류도 자동 재시도하지 않는다.

## 11. 웹훅과 폴링 병행 설계

웹훅과 폴링은 서로 다른 상태 처리 코드를 가지면 안 된다. 두 입력 모두 하나의 `reconcileTikTokPublishStatus` 비즈니스 함수로 전달한다.

### 11.1 웹훅

다음 이벤트를 처리한다.

- `post.publish.complete`
- `post.publish.failed`
- `post.publish.publicly_available`
- `post.publish.no_longer_publicaly_available`

웹훅 Route Handler는 다음 순서를 지킨다.

1. raw request body를 보존한다.
2. `TikTok-Signature`의 timestamp와 signature를 파싱한다.
3. `client_secret`으로 `timestamp + "." + rawBody`의 HMAC-SHA256을 계산한다.
4. constant-time comparison으로 signature를 확인한다.
5. timestamp 허용 범위를 확인해 replay를 차단한다.
6. `client_key`가 현재 앱과 일치하는지 확인한다.
7. 중복 이벤트를 멱등 처리한다.
8. 짧은 DB transaction으로 이벤트와 상태를 저장하고 신속히 `200`을 반환한다.

토큰, client secret, 전체 요청 헤더를 로그로 남기지 않는다.

### 11.2 폴링

웹훅 누락과 지연에 대비해 `/v2/post/publish/status/fetch/`를 background scheduler에서 호출한다. Server Action이나 사용자 요청 안에서 장시간 반복 폴링하지 않는다.

권장 backoff는 다음과 같다.

```text
15초 → 30초 → 60초 → 2분 → 5분 → 10분 반복
```

- destination이 terminal 상태가 되면 즉시 polling 대상에서 제외한다.
- access token당 상태 조회 한도 30회/분보다 충분히 낮게 중앙에서 제한한다.
- 같은 TikTok 사용자에게 처리 중인 게시물이 여러 개면 총 요청 수를 합산한다.
- `429`는 backoff 후 재시도한다.
- `5xx`, `internal`, 일시적인 `photo_pull_failed`는 제한된 횟수와 backoff로 재시도한다.
- TikTok은 처리 시간 상한을 보장하지 않으므로 일정 시간이 지났다는 이유만으로 자동 실패 처리하지 않는다. 장기 지연은 polling 간격을 늘리고 운영 알림 대상으로 표시한다.

### 11.3 경합 방지 상태 규칙

웹훅과 폴링이 동시에 도착할 수 있으므로 상태 변경은 DB transaction 또는 조건부 update로 처리한다.

Provider 상태는 다음처럼 정규화한다.

| 입력 | Sendbase 처리 |
|---|---|
| `PROCESSING_DOWNLOAD` | `processing` 유지 |
| `PUBLISH_COMPLETE` | `published` |
| `FAILED` | `failed`, `fail_reason` 저장 |
| `post.publish.complete` | `published` |
| `post.publish.failed` | `failed`, reason 저장 |
| `post.publish.publicly_available` | public post ID와 URL 보강 |
| `post.publish.no_longer_publicaly_available` | 공개 URL을 비활성화하되 발행 성공 기록은 유지 |
| `PROCESSING_UPLOAD`, `SEND_TO_USER_INBOX` | Direct Post 사진 범위 밖이므로 수동 확인 대상으로 기록 |

- `pending`, `publishing`, `processing`에서 terminal 상태로만 전진한다.
- `published` 또는 `failed`에서 `processing`으로 되돌리지 않는다.
- 동일 terminal 결과는 no-op으로 처리한다.
- 서로 다른 terminal 결과가 충돌하면 덮어쓰지 않고 `requires_manual_review=true`로 기록한 뒤 공식 status API로 재확인한다.
- `post.publish.publicly_available`은 공개 post ID와 URL을 보강하는 이벤트로 처리한다.
- 비공개 게시물에 공개 URL이 없다는 이유로 실패 처리하지 않는다.

상태 변경이 끝날 때 기존 게시물 집계 함수를 호출한다. 하나라도 `pending`, `publishing`, `processing`이면 전체 게시물은 `publishing`을 유지한다. 모든 destination이 terminal 상태가 된 후 `published`, `partial`, `failed`를 계산한다.

## 12. 오류 분류와 재시도

| 오류 | 처리 |
|---|---|
| `access_token_invalid` | refresh 한 번 후 원 요청 한 번 재시도 |
| `scope_not_authorized` | terminal 실패, 재연결 안내 |
| `rate_limit_exceeded` | backoff 후 재시도 |
| `internal`, 일부 `5xx` | 제한된 backoff 재시도 |
| `photo_pull_failed` | URL 접근성을 확인한 뒤 제한된 재시도 |
| `url_ownership_unverified` | terminal 실패, URL prefix 설정 오류로 안내 |
| `invalid_param`, 포맷·크기 오류 | terminal 실패, 사용자 또는 개발자 조치 안내 |
| `spam_risk_too_many_posts` | terminal 실패, 24시간 제한 안내 |
| `spam_risk_user_banned_from_posting` | terminal 실패, 자동 재시도 금지 |
| `auth_removed` | terminal 실패, 연결 해제 처리, 자동 재시도 금지 |
| 초기화 요청 timeout이며 `publish_id` 없음 | 자동 재시도 금지, 수동 확인 필요 |

사용자 메시지는 TikTok의 원문 오류를 그대로 노출하지 말고, 내부 error code를 안정적인 한국어 메시지로 매핑한다. 운영 로그에는 TikTok `log_id`, 내부 destination ID 및 안전한 error code만 남긴다.

## 13. 심사 및 운영 제한

TikTok 앱과 `video.publish` scope 승인을 받아야 한다. unaudited client는 다음 제한을 전제로 테스트한다.

- 최근 24시간 발행 사용자 최대 5명
- 비공개 계정만 사용
- 공개 범위는 `SELF_ONLY`만 허용

심사 후에도 active creator cap과 사용자별 24시간 발행 cap이 적용된다. 사용자별 cap은 일반적으로 약 15개이며 다른 API client와 공유될 수 있으므로 Sendbase 내부 카운터만으로 발행 가능 여부를 단정하지 않는다. Creator Info와 초기화 API의 오류를 최종 기준으로 사용한다.

Content Posting API의 사용자 access token별 제한도 중앙에서 관리한다.

- 사진 Direct Post 초기화: 분당 6회
- Creator Info: 분당 20회
- 게시 상태 조회: 분당 30회

UI 재렌더링으로 Creator Info를 반복 호출하지 않는다. TikTok 설정 UI가 처음 마운트될 때 한 번 조회하고, 사용자가 새로고침을 명시적으로 요청한 경우와 최종 서버 검증 시에만 다시 조회한다.

앱 설명과 UX는 사용자가 Sendbase에서 직접 작성하고 업로드한 본인의 원본 콘텐츠를 본인 TikTok 계정에 발행하는 흐름임을 명확히 해야 한다. 다른 플랫폼 콘텐츠를 임의로 수집하거나 복제하는 기능으로 보이게 구현하지 않는다.

## 14. 권장 파일 구조

구현 시 책임을 다음처럼 분리한다.

```text
app/api/connect/[platform]/route.ts                  OAuth 시작
app/api/connect/[platform]/callback/route.ts         OAuth callback
app/api/webhooks/tiktok/route.ts                     서명 검증 및 이벤트 수신
app/actions/posts.ts                                 공통 저장·발행 오케스트레이션
components/workspace/tiktok-publish-options.tsx      선택 시에만 로드되는 UI
lib/platforms/tiktok/client.ts                       TikTok HTTP client
lib/platforms/tiktok/oauth.ts                        토큰 교환·갱신·폐기
lib/platforms/tiktok/schema.ts                       공통 Zod 스키마
lib/platforms/tiktok/publish.ts                      요청 매핑·초기화
lib/platforms/tiktok/status.ts                       웹훅·폴링 상태 reconcile
lib/platforms/tiktok/images.ts                       파생본·URL 검증
```

- 비즈니스 로직은 `lib/platforms/tiktok`에 둔다.
- Route Handler와 Server Action은 인증, 파싱 및 비즈니스 함수 호출만 담당한다.
- layout을 Client Component로 변경하지 않는다.
- TikTok 전용 UI는 TikTok 선택 조건 안에서만 동적 import하고 마운트한다.
- TikTok SDK가 필요하지 않으므로 별도 클라이언트 의존성을 추가하지 않고 서버 `fetch`를 사용한다.
- 독립적인 네트워크 작업은 병렬화하되 동일 토큰 refresh나 동일 destination 발행은 직렬화한다.

## 15. 현재 코드에서 반드시 수정할 지점

- `lib/types.ts`
  - `publishPlatforms`와 `ApiPublishPlatform`에 `tiktok` 추가
- `lib/platforms/limits.ts`
  - 최대 이미지뿐 아니라 최소 이미지와 TikTok UTF-16 제한을 표현
- `lib/posts/schema.ts`
  - TikTok 옵션과 조건부 이미지 필수 검증 추가
- `lib/posts/images.ts`
  - TikTok용 WebP/JPEG 1080p 파생본 생성
- `components/workspace/post-editor.tsx`
  - TikTok 선택 여부만 구독하고 전용 UI를 조건부 마운트
  - TikTok에는 원문만 사용하며 reply merge 대상에서 제외
- `app/actions/posts.ts`
  - TikTok preflight와 비동기 `processing` 처리
  - `apiPlatformSchema`에 TikTok 추가
  - API 초기화 직후 `published`로 기록하지 않도록 분기
  - `finalizePost`가 `processing`을 미완료 상태로 처리
- `app/api/connect/[platform]/*`
  - TikTok OAuth 및 refresh token 저장 처리
- 새 웹훅 Route Handler와 polling worker
- 새 DB migration과 생성된 Supabase 타입

## 16. 테스트 계획

### 16.1 단위 테스트

- TikTok 미선택 시 TikTok 옵션이 없어도 통과
- TikTok 선택 + 이미지 0장 실패
- 이미지 1장과 35장 통과, 36장 실패
- 제목 90 UTF-16 단위 통과, 91 실패
- emoji가 포함된 UTF-16 길이 계산
- description 4,000 단위 경계
- cover index 음수 또는 배열 범위 밖 실패
- Creator Info에 없는 공개 범위 실패
- `comment_disabled=true`와 댓글 허용 조합 실패
- 브랜드 콘텐츠 + `SELF_ONLY` 실패
- 상업 콘텐츠인데 브랜드 유형 미선택 실패
- 필요한 동의 미완료 실패
- `allowComment`에서 `disable_comment`으로 올바르게 반전
- reply가 TikTok description과 이미지에 포함되지 않음

### 16.2 이미지 테스트

- JPEG, WebP, PNG, 투명 PNG, GIF 입력 fixture
- TikTok 결과물이 JPEG 또는 WebP인지 확인
- 1080p 범위와 20MB 이하 확인
- 이미지 순서 유지
- 커버 인덱스 유지
- 다른 사용자 Storage URL 거부
- 등록하지 않은 bucket 또는 URL prefix 거부
- 공개 URL이 redirect 없이 `200`을 반환하는지 운영 통합 테스트

### 16.3 OAuth와 API 테스트

- state 불일치 callback 거부
- 부분 scope 승인 시 `video.publish` 누락 처리
- refresh token rotation 원자적 저장
- 동시 refresh 경쟁 방지
- Creator Info rate limit과 게시 제한 오류 매핑
- 초기화 성공 후 `processing` 유지
- timeout 시 자동 중복 발행 방지

### 16.4 웹훅과 폴링 테스트

- 올바른 signature 승인
- 잘못된 signature와 오래된 timestamp 거부
- 같은 웹훅 중복 전달이 no-op
- polling이 먼저 완료한 뒤 같은 웹훅이 오는 경우 no-op
- 웹훅이 먼저 완료한 뒤 늦은 processing poll이 상태를 되돌리지 않음
- 웹훅 누락 시 polling만으로 완료
- polling 누락 시 웹훅만으로 완료
- 공개 post ID가 나중에 도착할 때 URL 보강
- terminal 충돌 시 수동 확인 상태

### 16.5 UI 및 E2E 테스트

- TikTok 미선택 시 전용 청크와 UI가 로드되지 않음
- TikTok 선택 시에만 설정 UI 표시
- TikTok 선택 해제 시 공개 범위와 동의 상태 폐기
- 공개 범위에 기본값이 없음
- 별도 미리보기 없이 공통 편집기 내용이 그대로 요청에 사용됨
- TikTok과 다른 플랫폼 동시 발행 시 TikTok은 processing, 다른 플랫폼은 독립적으로 완료
- TikTok 완료 전 전체 게시물이 최종 완료로 표시되지 않음
- 비공개 TikTok 게시물에 URL이 없어도 성공으로 처리

## 17. 출시 체크리스트

- [ ] TikTok Developer 앱 등록
- [ ] Content Posting API와 Direct Post 활성화
- [ ] `video.publish` scope 승인
- [ ] OAuth redirect URI 등록
- [ ] Supabase public Storage URL prefix 검증
- [ ] Content Posting webhook URL 등록
- [ ] unaudited client 제한으로 sandbox 테스트
- [ ] TikTok 전용 UI가 선택 시에만 로드되는지 bundle 확인
- [ ] 클라이언트·서버 공통 Zod 검증 완료
- [ ] TikTok 이미지 파생본 검증 완료
- [ ] 웹훅 signature, replay 및 멱등 처리 완료
- [ ] background polling과 rate limit 제어 완료
- [ ] 초기화 timeout 중복 발행 방지 완료
- [ ] 전체 게시물 집계가 `processing`을 기다리는지 확인
- [ ] 사용자 오류 메시지와 운영 알림 확인
- [ ] TikTok 심사 제출용 UX와 서비스 설명 점검
- [ ] `supabase db push` 수행
- [ ] Supabase TypeScript 타입 재생성
