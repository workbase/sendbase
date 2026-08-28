# Sendbase

Threads, X, Discord, 네이버 카페, SOOP 게시판에 하나의 게시물을 일괄 게시하는 Next.js 앱입니다.

## 로컬 설정

1. `.env.example`을 참고해 `.env.local`에 Supabase와 각 OAuth 앱의 값을 추가합니다.
2. `TOKEN_ENCRYPTION_KEY`에는 32자 이상의 임의 문자열을 사용합니다.
3. Supabase 마이그레이션을 적용합니다.

```bash
supabase db push
```

4. OAuth 앱에 아래 콜백 URL을 등록합니다.

- 로그인: `/api/auth/chzzk/callback`, `/api/auth/soop/callback`, `/api/auth/cime/callback`
- 게시 연결: `/api/connect/threads/callback`, `/api/connect/x/callback`, `/api/connect/discord/callback`

5. 네이버 카페와 SOOP 게시에는 `guide/extension.md`의 센드베이스 게시글 플러그인이 필요합니다. 운영 도메인을 확장 프로그램의 `content_scripts.matches`에 추가하세요.

TikTok 일괄 발행을 구현하거나 운영할 때는 [`guide/tiktok-content-posting.md`](guide/tiktok-content-posting.md)의 API, 이미지, OAuth, 웹훅 및 폴링 지침을 따르세요.

## 개발

```bash
pnpm dev
```

DB 스키마를 적용한 뒤 Supabase 타입을 다시 생성해 프로젝트 타입에 반영하세요.
