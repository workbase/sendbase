인증
인증 방식
씨미 OpenAPI는 두 가지 인증 방식을 지원합니다.

인증 방식	사용 헤더	용도
Client ID/Secret	Client-Id, Client-Secret	공개 정보 조회 (채널 정보, 라이브 목록 등)
Access Token (Bearer)	Authorization: Bearer {token}	사용자 권한 API (팔로워, 채팅 전송 등)
Client ID/Secret 사용 예시

GET /api/openapi/open/v1/channels?channelIds=12345
Client-Id: {clientId}
Client-Secret: {clientSecret}
Access Token 사용 예시

GET /api/openapi/open/v1/users/me
Authorization: Bearer {accessToken}
애플리케이션 등록
API를 사용하려면 먼저 개발자 포탈에서 애플리케이션을 등록해야 합니다.

개발자 포탈(/applications)에 로그인합니다.
+ 새 애플리케이션 버튼을 눌러 애플리케이션을 생성합니다.
생성된 Client ID와 Client Secret을 안전하게 보관합니다.
OAuth 인증에 사용할 Redirect URI를 설정합니다.
Client Secret은 외부에 노출되지 않도록 주의하세요. 서버 사이드 코드에서만 사용하는 것을 권장합니다.

애플리케이션 이름 규칙

항목	제한
길이	2~20자
허용 문자	한글, 영문, 숫자, 밑줄(_), 공백
OAuth 2.0 Authorization Code Flow
사용자 권한이 필요한 API를 호출하려면 OAuth 2.0 Authorization Code Flow를 통해 Access Token을 발급받아야 합니다.

전체 흐름
1. 사용자를 씨미 인증 페이지로 리디렉트
   → https://ci.me/auth/openapi/account-interlock
     ?clientId={clientId}
     &redirectUri={redirectUri}
     &state={state}

2. 사용자가 권한 승인

3. 씨미가 Redirect URI로 Authorization Code 전달
   → https://your-app.com/callback?code={authorizationCode}&state={state}

4. Authorization Code로 Access Token 발급
   POST /api/openapi/auth/v1/token
   {
     "grantType": "authorization_code",
     "clientId": "{clientId}",
     "clientSecret": "{clientSecret}",
     "code": "{authorizationCode}"
   }

5. Access Token으로 API 호출
   Authorization: Bearer {accessToken}

6. 토큰 만료 시 Refresh Token으로 갱신
   POST /api/openapi/auth/v1/token
   {
     "grantType": "refresh_token",
     "clientId": "{clientId}",
     "clientSecret": "{clientSecret}",
     "refreshToken": "{refreshToken}"
   }
토큰 유효 시간
토큰	유효 시간	비고
Authorization Code	10분	발급 후 10분 이내에 Access Token으로 교환해야 합니다
Access Token	1일 (86,400초)	만료 시 Refresh Token으로 갱신할 수 있습니다
Refresh Token	6개월	발급/갱신 시점부터 6개월간 유효합니다. 토큰 갱신 시 새 Refresh Token으로 교체됩니다
Refresh Token은 1회용입니다 (Rotation). refresh_token 그랜트로 토큰을 갱신하면 응답으로 새 accessToken과 **새 refreshToken**이 함께 발급되고, 기존 refreshToken은 즉시 무효화됩니다. 따라서 클라이언트는 갱신 응답에서 받은 새 refreshToken을 반드시 저장하고 다음 갱신에 사용해야 합니다. 이전 refreshToken을 재사용하면 401(Refresh token has already been used)이 발생합니다. 새 Refresh Token의 유효 기간도 갱신 시점 기준 6개월로 다시 시작됩니다.

토큰 발급 API
POST /api/openapi/auth/v1/token

파라미터	타입	필수	설명
grantType	string	O	"authorization_code" 또는 "refresh_token"
clientId	string	O	애플리케이션 Client ID
clientSecret	string	O	애플리케이션 Client Secret
code	string	조건부	grantType이 "authorization_code"일 때 필수
refreshToken	string	조건부	grantType이 "refresh_token"일 때 필수
응답:

{
  "code": 200,
  "message": null,
  "content": {
    "accessToken": "eyJhbGciOiJ...",
    "refreshToken": "dGhpcyBpc...",
    "tokenType": "Bearer",
    "expiresIn": "86400",
    "scope": "READ:USER READ:CHANNEL"
  }
}
위 성공 응답은 { code, message, content } 래퍼 형식입니다. 반면 인증 실패(401) 등 에러는 { statusCode, message, error } 형태로 내려가므로 성공 응답과 에러 응답의 구조가 다릅니다. 응답 처리 시 HTTP 상태 코드로 성공/실패를 먼저 판별하세요.

토큰 발급/갱신 시 401 처리
토큰 발급(authorization_code) 또는 갱신(refresh_token) 요청이 인증에 실패하면 HTTP 401 Unauthorized와 함께 다음과 같은 에러 응답이 반환됩니다.

{
  "statusCode": 401,
  "message": "Refresh token has already been used",
  "error": "Unauthorized"
}
주요 401 케이스:

message	발생 상황
Invalid client credentials	clientId/clientSecret이 일치하지 않음
Authorization code is required	authorization_code 그랜트인데 code 누락
Invalid authorization code	존재하지 않는 Authorization Code
Authorization code does not belong to this application	다른 애플리케이션의 Authorization Code
Authorization is not active	취소(revoke)되었거나 비활성 상태의 인증
Authorization code has expired	만료된(10분 초과) Authorization Code
Refresh token is required	refresh_token 그랜트인데 refreshToken 누락
Invalid refresh token	존재하지 않는 Refresh Token
Refresh token has been revoked	취소된 Refresh Token
Refresh token has already been used	이미 사용된(Rotation으로 교체된) Refresh Token
Refresh token does not belong to this application	다른 애플리케이션의 Refresh Token
Refresh token has expired	만료된 Refresh Token
회복 절차

refresh_token 갱신에서 401을 받으면, 보관 중인 유효한 Refresh Token으로 재시도합니다. (직전 갱신 응답에서 받은 최신 Refresh Token만 유효합니다.)
유효한 Refresh Token이 없거나 재시도도 401이면, 처음부터 OAuth 2.0 Authorization Code Flow로 재인증하여 새 토큰을 발급받아야 합니다.
토큰 취소 API
POST /api/openapi/auth/v1/token/revoke

파라미터	타입	필수	설명
clientId	string	O	애플리케이션 Client ID
clientSecret	string	O	애플리케이션 Client Secret
token	string	O	취소할 토큰
tokenTypeHint	string	O	취소할 토큰의 종류. "access_token" 또는 "refresh_token"
취소에 성공하면 응답 바디 없이 HTTP 200 OK만 반환됩니다. tokenTypeHint로 지정한 토큰뿐 아니라 해당 인증에 연결된 Access/Refresh Token이 모두 함께 취소되고, 인증 상태도 REVOKED로 변경됩니다.

존재하지 않거나 이미 취소된 토큰, 또는 다른 애플리케이션의 토큰을 취소하려 하면 HTTP 401 Unauthorized가 반환됩니다.

Scope 레퍼런스
Scope는 Access Token이 접근할 수 있는 API 범위를 정의합니다.

Scope	설명	관련 API
READ:USER	사용자 정보 조회	현재 사용자 정보
READ:CHANNEL	채널 정보 조회	팔로워 목록, 관리자 목록
READ:SUBSCRIPTION	구독 정보 조회	구독자 목록, 구독 이벤트
READ:LIVE_STREAM_KEY	스트림 키 조회	스트림 키 조회
READ:LIVE_STREAM_SETTINGS	라이브 설정 조회	라이브 설정 조회
WRITE:LIVE_STREAM_SETTINGS	라이브 설정 변경	라이브 설정 변경
READ:LIVE_CHAT	채팅 이벤트 조회	채팅 이벤트 구독
WRITE:LIVE_CHAT	채팅 메시지 전송	채팅 메시지 전송
WRITE:LIVE_CHAT_NOTICE	채팅 공지 등록	채팅 공지 등록
READ:LIVE_CHAT_SETTINGS	채팅 설정 조회	채팅 설정 조회
WRITE:LIVE_CHAT_SETTINGS	채팅 설정 변경	채팅 설정 변경
WRITE:USER_BLOCK	사용자 추방/해제	사용자 추방, 추방 해제
READ:USER_BLOCK	추방 사용자 조회	추방 사용자 목록
READ:DONATION	후원 정보 조회	후원 이벤트 구독
