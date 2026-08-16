사용자 API
현재 사용자 정보 조회
Access Token에 연결된 사용자의 채널 정보를 조회합니다.

GET /api/openapi/open/v1/users/me

인증: Access Token (Bearer)
필요 Scope: READ:USER
응답

{
  "code": 200,
  "message": null,
  "content": {
    "channelId": "12345",
    "channelName": "내 채널",
    "channelHandle": "my-channel",
    "channelImageUrl": "https://example.com/image.png"
  }
}