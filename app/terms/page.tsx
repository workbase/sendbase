import type { Metadata } from "next"
import Link from "next/link"

import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { CopyContact } from "@/components/terms/copy-contact"
import { Toaster } from "@/components/ui/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "이용 약관 및 개인정보처리방침",
}

const effectiveDate = "2026년 8월 23일"

export default function TermsPage() {
  return (
    <main className="min-h-svh bg-muted">
      <Link
        href="/"
        className="fixed top-5 left-5 z-20 text-foreground"
        aria-label="Sendbase 홈"
      >
        <SendbaseLogo className="h-auto w-32" />
      </Link>
      <div className="mx-auto w-full max-w-3xl px-4 pt-28 pb-12 sm:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            이용 약관 및 개인정보처리방침
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            시행일: {effectiveDate}
          </p>
        </header>
        <Tabs defaultValue="terms">
          <TabsList variant="line" aria-label="약관 문서">
            <TabsTrigger value="terms">이용 약관</TabsTrigger>
            <TabsTrigger value="privacy">개인정보처리방침</TabsTrigger>
          </TabsList>
          <TabsContent value="terms" className="pt-8">
            <TermsContent />
          </TabsContent>
          <TabsContent value="privacy" className="pt-8">
            <PrivacyContent />
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </main>
  )
}

function DocumentSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="border-t py-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

function TermsContent() {
  return (
    <article>
      <DocumentSection title="1. 서비스 소개와 약관의 적용">
        <p>
          센드베이스는 사용자가 작성한 공지를 여러 커뮤니티 채널에 게시할 수
          있도록 돕는 서비스입니다. 본 약관은 센드베이스 이용과 관련한 사용자와
          서비스 운영자 간의 권리와 의무를 정합니다.
        </p>
        <p>
          서비스를 이용하면 본 약관과 개인정보처리방침에 동의한 것으로 봅니다.
          관련 법령 또는 서비스 운영 방식이 변경되면 시행일과 함께 약관을
          업데이트할 수 있습니다.
        </p>
      </DocumentSection>
      <DocumentSection title="2. 계정과 이용자의 책임">
        <p>
          사용자는 치지직, SOOP 또는 씨미 계정의 공식 OAuth 인증을 통해 로그인할
          수 있습니다. 로그인 계정의 관리와 인증 수단의 보안은 사용자의 책임입니다.
        </p>
        <p>
          사용자는 게시 권한이 있는 계정과 채널만 연결해야 하며, 타인의 권리,
          플랫폼 정책 또는 법령을 위반하는 콘텐츠를 게시해서는 안 됩니다.
        </p>
      </DocumentSection>
      <DocumentSection title="3. 외부 플랫폼 연결과 권한">
        <OAuthScopeTable />
        <p>
          네이버 카페와 SOOP 게시판은 OAuth 권한을 요청하지 않으며, 사용자가
          설치한 브라우저 확장 프로그램을 통해 입력한 게시판 대상으로 자동 작성
          요청을 전달합니다.
        </p>
      </DocumentSection>
      <DocumentSection title="4. 게시와 외부 서비스">
        <p>
          사용자가 게시를 실행하면 선택한 채널로 제목, 본문 및 첨부 이미지를 전송합니다. 게시 결과와 노출 상태는 각 외부 플랫폼의 시스템, 정책 및 네트워크 상태에 따라 달라질 수 있습니다.
        </p>
        <p>
          사용자는 연결된 플랫폼의 이용약관과 정책을 함께 준수해야 합니다. 외부 플랫폼의 제한, 삭제, 장애 또는 정책 변경으로 발생한 게시 실패나 손해에 대해 센드베이스는 법령이 허용하는 범위에서 책임을 제한합니다.
        </p>
      </DocumentSection>
      <DocumentSection title="5. 이용 제한과 종료">
        <p>
          서비스의 안정성 또는 법령 준수를 위해 부정 이용, 보안 위협, 권리 침해가 확인되거나 합리적으로 의심되는 경우 이용을 제한할 수 있습니다. 사용자는 설정에서 플랫폼 연결을 해제할 수 있으며, 계정 삭제 기능으로 계정과 서비스 내 데이터를 삭제할 수 있습니다.
        </p>
      </DocumentSection>
    </article>
  )
}

function PrivacyContent() {
  return (
    <article>
      <DocumentSection title="1. 수집하는 정보">
        <PersonalDataTable />
      </DocumentSection>
      <DocumentSection title="2. 처리 목적과 방식">
        <p>
          수집한 정보는 로그인과 세션 유지, 연결한 플랫폼 계정 식별, 사용자가 요청한 콘텐츠 게시, 게시 이력 표시, 연결 설정 관리 및 보안 검증에만 사용합니다. OAuth 인증 요청의 state 값은 위조 요청 방지를 위해 짧은 기간의 HTTP 전용 쿠키로 보관하며, X 연결에는 PKCE 검증값을 함께 사용합니다.
        </p>
        <p>
          액세스 토큰과 갱신 토큰은 서버에서 암호화하여 저장하며 브라우저에 제공하지 않습니다. 토큰은 게시 또는 필요한 갱신 시에만 외부 플랫폼 API에 전송합니다.
        </p>
      </DocumentSection>
      <DocumentSection title="3. 보관, 공개 및 파기">
        <RetentionTable />
      </DocumentSection>
      <DocumentSection title="4. 제3자 제공 및 처리 위탁">
        <p>
          사용자가 선택한 게시 대상에 한해 콘텐츠와 게시에 필요한 인증 정보를 Threads, X, Discord 등 해당 외부 플랫폼으로 전송합니다. 로그인 시에는 선택한 OAuth 제공자와 인증 정보를 교환합니다. 서비스 데이터와 이미지 저장을 위해 Supabase의 데이터베이스 및 저장소를 이용합니다.
        </p>
      </DocumentSection>
      <DocumentSection title="5. 이용자의 권리와 문의">
        <p>
          사용자는 설정에서 플랫폼 연결을 해제하고, 계정 삭제를 통해 서비스 내 개인정보의 삭제를 요청할 수 있습니다. 외부 플랫폼의 OAuth 권한 철회는 해당 플랫폼의 계정 설정에서 직접 진행해야 합니다.
        </p>
        <div className="rounded-md border bg-background p-4 text-foreground">
          <dl className="space-y-2">
            <div className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground">개인정보처리자</dt>
              <dd>워크베이스 주식회사</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground">개인정보보호책임자</dt>
              <dd>신용우</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground">문의</dt>
              <dd><CopyContact /></dd>
            </div>
          </dl>
        </div>
        <p>
          개인정보 침해에 대한 상담이나 분쟁조정이 필요한 경우 개인정보침해
          신고센터(국번 없이 118), 개인정보 분쟁조정위원회(1833-6972),
          경찰청(국번 없이 182) 등 관계 기관에 문의할 수 있습니다.
        </p>
      </DocumentSection>
    </article>
  )
}

function OAuthScopeTable() {
  return (
    <LegalTable>
      <TableHeader>
        <TableRow>
          <TableHead>플랫폼</TableHead>
          <TableHead>요청 권한</TableHead>
          <TableHead>사용 목적</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Threads</TableCell>
          <TableCell className="whitespace-normal">
            threads_basic, threads_content_publish
          </TableCell>
          <TableCell className="whitespace-normal">
            계정 식별 정보 확인 및 콘텐츠 게시
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>X</TableCell>
          <TableCell className="whitespace-normal">
            tweet.read, tweet.write, users.read, offline.access
          </TableCell>
          <TableCell className="whitespace-normal">
            계정 확인, 게시 및 연결 유지를 위한 토큰 갱신
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Discord</TableCell>
          <TableCell className="whitespace-normal">
            identify, webhook.incoming
          </TableCell>
          <TableCell className="whitespace-normal">
            생성된 웹훅 대상에 메시지 게시
          </TableCell>
        </TableRow>
      </TableBody>
    </LegalTable>
  )
}

function PersonalDataTable() {
  return (
    <LegalTable>
      <TableHeader>
        <TableRow>
          <TableHead>구분</TableHead>
          <TableHead>처리하는 정보</TableHead>
          <TableHead>처리 목적</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>로그인</TableCell>
          <TableCell className="whitespace-normal">
            계정 식별자, 표시 이름, 프로필 이미지, OAuth 토큰과 만료 정보, 세션 토큰
          </TableCell>
          <TableCell className="whitespace-normal">인증 및 세션 유지</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>플랫폼 연결</TableCell>
          <TableCell className="whitespace-normal">
            연결 플랫폼, 외부 계정 식별자·표시 이름, 게시 토큰·만료 정보, Discord 웹훅 정보, 네이버 카페·SOOP 게시판 설정
          </TableCell>
          <TableCell className="whitespace-normal">계정 연결 및 게시 대상 관리</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>게시</TableCell>
          <TableCell className="whitespace-normal">
            제목, 본문, 첨부 이미지, 선택한 게시 대상 및 게시 결과
          </TableCell>
          <TableCell className="whitespace-normal">게시 실행 및 이력 표시</TableCell>
        </TableRow>
      </TableBody>
    </LegalTable>
  )
}

function RetentionTable() {
  return (
    <>
      <LegalTable>
        <TableHeader>
          <TableRow>
            <TableHead>정보</TableHead>
            <TableHead>보관 및 파기</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>계정, 연결 정보, 게시 이력</TableCell>
            <TableCell className="whitespace-normal">
              계정 유지 기간 동안 보관하며, 계정 삭제 시 데이터베이스에서 함께 삭제합니다.
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>게시 이미지</TableCell>
            <TableCell className="whitespace-normal">
              공개 이미지 저장소에 저장되어 게시와 미리보기를 위한 공개 URL로 제공될 수 있으며, 계정 삭제 시 삭제를 시도합니다.
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>외부 플랫폼 게시물</TableCell>
            <TableCell className="whitespace-normal">
              서비스에서 계정을 삭제해도 외부 플랫폼의 게시물은 남으므로 해당 플랫폼에서 별도로 삭제해야 합니다.
            </TableCell>
          </TableRow>
        </TableBody>
      </LegalTable>
      <p>민감한 정보나 공개되어서는 안 되는 이미지는 업로드하지 마세요.</p>
    </>
  )
}

function LegalTable({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <Table>{children}</Table>
    </div>
  )
}
