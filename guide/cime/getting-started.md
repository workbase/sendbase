시작하기
기본 URL
모든 OpenAPI 요청은 아래 Base URL을 기준으로 합니다.

https://ci.me/api/openapi
공통 응답 형식
모든 API는 다음과 같은 통일된 JSON 형식으로 응답합니다.

{
  "code": 200,
  "message": null,
  "content": {
    ...
  }
}
필드	타입	설명
code	number	응답 코드. 성공 시 200
message	string | null	에러 메시지. 성공 시 null
content	object | null	응답 데이터
에러 처리
에러 발생 시 HTTP 상태 코드와 함께 에러 정보가 반환됩니다.

HTTP 상태 코드	설명	발생 상황
400 Bad Request	입력 검증 실패	잘못된 파라미터, 자기 자신 추방 시도 등
401 Unauthorized	인증 실패	토큰 만료, 유효하지 않은 인증 정보, Scope 부족
404 Not Found	리소스 없음	존재하지 않는 채널, 라이브, 채팅방 등
500 Internal Server Error	서버 내부 오류	예기치 못한 서버 에러
성공 응답과 에러 응답의 구조가 다릅니다. 성공 응답은 위의 { code, message, content } 래퍼 형식이지만, 인증 실패(401) 등 에러는 { statusCode, message, error } 형태로 내려갑니다. 따라서 에러 여부는 응답 바디의 code 필드가 아니라 HTTP 상태 코드로 판별하세요.

에러 응답 형식:

{
  "statusCode": 401,
  "message": "Invalid client credentials",
  "error": "Unauthorized"
}
제한사항
항목	제한값
Access Token 유효시간	86,400초 (1일)
Authorization Code 유효시간	10분
앱당 최대 클라이언트 세션	10개
사용자당 최대 사용자 세션	3개
세션당 최대 이벤트 구독	30개
세션 유효시간	43,200초 (12시간)
채널 조회 최대 건수	20개
라이브 목록 최대 건수	20개
카테고리 검색 최대 건수	50개
앱 이름 길이	2~20자
앱 이름 허용 문자	한글, 영문, 숫자, 밑줄, 공백
채팅 메시지 최대 길이	100자
라이브 제목 최대 길이	100자
태그 최대 개수	6개