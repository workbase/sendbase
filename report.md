1. 알려진 취약점이 있는 패키지 업데이트
pnpm audit --prod 결과는 High 11건, Moderate 10건입니다. 중복 권고와 실제 런타임에 쓰이지 않는 경로도 포함되지만, 다음 직접 의존성은 바로 올려야 합니다.
- Next.js 16.2.6 → 16.2.11 이상
- sharp 0.34.5 → 0.35.0 이상
- 모든 Tiptap 패키지 3.30.1 → 3.30.4 이상
- 잠금 파일에서 postcss >= 8.5.23, fast-uri >= 3.1.6, qs >= 6.16.0인지 확인
- 런타임에서 사용하지 않는 shadcn CLI는 devDependencies로 이동
특히 Sharp는 사용자가 업로드한 파일을 직접 처리하므로 권고의 관련성이 높습니다. [package.json (line 17)](/Users/yongwooshin/Documents/sendbase/package.json:17), [Next.js 권고](https://github.com/advisories/GHSA-m99w-x7hq-7vfj), [Sharp 권고](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [Tiptap 권고](https://github.com/advisories/GHSA-cp6q-959q-f8rh)
2. 이미지 URL을 통한 SSRF 및 메모리 DoS
서버는 HTML 안의 모든 http/https 이미지 URL을 허용한 뒤, X와 Discord 게시 과정에서 그대로 fetch합니다.
- URL 허용: [content.ts (line 9)](/Users/yongwooshin/Documents/sendbase/lib/posts/content.ts:9)
- X 서버 fetch: [publish.ts (line 481)](/Users/yongwooshin/Documents/sendbase/lib/platforms/publish.ts:481)
- Discord 서버 fetch: [publish.ts (line 533)](/Users/yongwooshin/Documents/sendbase/lib/platforms/publish.ts:533)
인증 사용자가 내부 IP, 클라우드 메타데이터 주소, 응답이 끝나지 않는 서버 등을 요청하게 만들 수 있습니다. 무료 서비스라 계정 생성 비용도 낮습니다.
가장 간단한 해결책은 모든 플랫폼에서 “현재 사용자 경로의 Supabase post-media HTTPS URL”만 허용하는 것입니다. 추가로 리다이렉트 금지, 10초 타임아웃, MIME 확인, 스트리밍 최대 크기 제한이 필요합니다. TikTok 경로에는 이미 비슷한 소유권 검증이 구현돼 있습니다.
3. SOOP 로그인 CSRF
SOOP 로그인에서는 state를 쿠키에 만들지만 OAuth 요청에는 전달하지 않고, 콜백에서는 쿠키가 존재하는지만 확인합니다.
- 로그인 요청: [route.ts (line 20)](/Users/yongwooshin/Documents/sendbase/app/api/auth/[provider]/route.ts:20)
- 불완전한 검증: [callback route.ts (line 212)](/Users/yongwooshin/Documents/sendbase/app/api/auth/[provider]/callback/route.ts:212)
공격자의 OAuth code를 피해자의 브라우저에서 처리해 공격자 계정으로 로그인시키는 login CSRF가 가능합니다. 이후 피해자가 자신의 게시 플랫폼을 연결하면 공격자 계정에 붙을 수 있습니다.
공식 문서를 확인하고 SOOP이 state를 지원한다면 반드시 왕복 검증하고, 가능하면 PKCE도 적용해야 합니다.
4. Discord 웹훅 비밀정보가 브라우저로 전달됨
Discord 웹훅 URL에는 게시 권한 토큰이 포함되어 있어 비밀번호와 동일하게 취급해야 합니다. 현재는 settings.webhookUrl에 평문 저장되고, 대시보드 RPC가 전체 settings를 반환한 뒤 Client Component에 전달합니다.
- 평문 저장: [callback route.ts (line 147)](/Users/yongwooshin/Documents/sendbase/app/api/connect/[platform]/callback/route.ts:147)
- 전체 settings 반환: [migration (line 157)](/Users/yongwooshin/Documents/sendbase/supabase/migrations/20260828091826_fix_tiktok_history_links.sql:157)
- 클라이언트 DTO 변환: [queries.ts (line 52)](/Users/yongwooshin/Documents/sendbase/lib/dashboard/queries.ts:52)
별도 webhook_url_encrypted 컬럼으로 이전하고, 클라이언트에는 플랫폼별로 필요한 안전한 설정만 화이트리스트해서 전달해야 합니다. 기존 Discord 연결은 수정 배포 후 한 번 재연결하도록 하는 것이 안전합니다.