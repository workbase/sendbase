분석 결과, 가장 큰 원인은 서버 렌더링보다 폰트·이미지·초기 JavaScript 전송량입니다. 특히 첫 방문에서 이미지 제외 약 7.4MB를 받도록 구성되어 있습니다.
측정 결과
항목	현재 상태	영향
Pretendard 폰트	9개 모두 preload, 총 6.90MB	가장 큰 병목
랜딩 초기 JS	1.54MB 원본 / 448KB gzip	다운로드·파싱·하이드레이션 지연
대시보드 초기 JS	1.53MB / 444KB gzip	동일
설정 초기 JS	1.15MB / 324KB gzip	높음
랜딩 HTML	104KB / 23KB gzip	보통
CSS	209KB / 31KB gzip	낮음
비로그인 TTFB	워밍 상태 5–9ms	양호
세션 조회 경로	워밍 53–112ms, 첫 연결 856ms	로그인 사용자·콜드 스타트 영향


1. 폰트 9개가 모두 즉시 다운로드됨 — 최우선
[app/layout.tsx (line 9)](/Users/yongwooshin/Documents/sendbase/app/layout.tsx:9)에서 100부터 900까지 아홉 굵기를 모두 next/font/local에 선언했습니다. 실제 응답의 Link 헤더에도 9개가 전부 preload되고 있습니다.
코드에서 실사용되는 굵기는 사실상 400·500·600 중심입니다.
해결책:
Pretendard Korean subset 또는 variable font로 교체
최소한 400·500·600만 선언
비핵심 폰트는 preload: false
첫 화면 폰트 전송량을 500KB 이하로 제한
이것만으로 첫 방문 전송량을 약 6MB 이상 줄일 수 있습니다.
2. 게시물 이미지가 원본 크기로 전부 로딩될 가능성 — 최우선
[app/actions/posts.ts (line 308)](/Users/yongwooshin/Documents/sendbase/app/actions/posts.ts:308)은 최대 10MB 이미지를 리사이즈나 압축 없이 그대로 저장합니다. 또한 [post-history.tsx (line 117)](/Users/yongwooshin/Documents/sendbase/components/workspace/post-history.tsx:117)는 HTML 안의 이미지를 그대로 렌더링하므로, 초기 8개 게시물의 이미지가 eager-load될 수 있습니다.
CSS의 max-h-96은 표시 크기만 줄이고 다운로드 용량은 줄이지 않습니다.
해결책:
업로드 시 최대 폭 1600px 정도로 축소하고 WebP/AVIF로 변환
썸네일과 게시용 원본을 별도로 생성
히스토리 이미지는 loading="lazy"와 decoding="async" 적용
너비·높이를 저장해 레이아웃 이동 방지
[content.ts (line 16)](/Users/yongwooshin/Documents/sendbase/lib/posts/content.ts:16)의 data: 이미지 허용 제거
초기 목록에는 썸네일/요약만 보내고, “재사용” 시 전체 내용을 조회
이미지가 많은 계정에서는 이것이 폰트보다 더 큰 실제 병목일 수 있습니다.
3. 랜딩에서도 전체 Tiptap 편집기를 즉시 로드함
[app/page.tsx (line 100)](/Users/yongwooshin/Documents/sendbase/app/page.tsx:100)이 대시보드와 동일한 PostEditor를 사용합니다. 이 컴포넌트는 [post-editor.tsx (line 13)](/Users/yongwooshin/Documents/sendbase/components/workspace/post-editor.tsx:13)에서 Tiptap 확장, ProseMirror, react-hook-form, Zod, Base UI 등을 모두 정적으로 import합니다.
Tiptap/ProseMirror와 Base UI/Zod 관련 청크만 압축 기준 약 284KB입니다.
해결책:
랜딩 전용 LandingEditor를 별도로 제작
첫 화면은 서버 렌더링된 정적 입력 UI와 로그인 CTA만 표시
사용자가 편집 영역을 클릭하거나 포커스했을 때 Tiptap을 동적 import
BrowserSupportDialog도 지원하지 않는 브라우저에서만 지연 로드
대시보드 편집기는 화면 골격/게시 기록 이후 별도 Suspense 경계로 로드
목표는 랜딩 초기 JS를 현재 448KB에서 200KB 이하로 낮추는 것입니다.
4. 로그인 대시보드는 DB 왕복이 두 단계
[dashboard/page.tsx (line 12)](/Users/yongwooshin/Documents/sendbase/app/(workspace\)/dashboard/page.tsx:12)는 먼저 세션을 조회한 다음 게시물과 연결 정보를 병렬 조회합니다.
세션 조회 1회
   ↓ userId 확인
게시물 + 연결 정보 2회 병렬
Promise.all은 잘 적용되어 있지만, 전체적으로는 최소 두 번의 네트워크 왕복 단계입니다. [session.ts (line 48)](/Users/yongwooshin/Documents/sendbase/lib/auth/session.ts:48)의 첫 Supabase 연결에서 콜드 지연도 확인됐습니다.
해결책:
앱 서버와 Supabase 리전을 동일하게 맞췄는지 확인
세션·사용자·연결·초기 게시물을 한 번에 반환하는 읽기 전용 RPC 검토
login_accounts.user_id 조회가 커지면 EXPLAIN ANALYZE 후 인덱스 추가
loading.tsx와 Suspense로 서버 응답을 기다리는 동안 즉시 골격 표시
DB 변경은 새 migration으로만 추가
5. 공개 랜딩도 항상 동적·no-store 응답
랜딩에서 [getCurrentUser() (line 72)](/Users/yongwooshin/Documents/sendbase/app/page.tsx:72)를 호출하므로 응답이 private, no-cache, no-store입니다. 비로그인 사용자의 응답 자체는 빠르지만 CDN 정적 캐시를 사용할 수 없습니다.
개선하려면 쿠키가 없는 공개 요청과 세션 검증이 필요한 요청을 별도 경로로 분리해, 익명 랜딩은 정적/CDN 캐시가 가능하도록 구성할 수 있습니다. 다만 만료 쿠키의 리다이렉트 루프를 막는 검증 흐름이 함께 필요합니다.
권장 실행 순서
폰트 subset/variable 적용 및 preload 축소  
이미지 업로드 최적화와 lazy loading  
랜딩용 경량 편집기 분리 및 Tiptap 지연 로드  
loading.tsx/Suspense 적용  
Supabase 리전과 쿼리 실행 계획 확인 후 RPC·인덱스 최적화  
익명 랜딩 정적 캐시 분리