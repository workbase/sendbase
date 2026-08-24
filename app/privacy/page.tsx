import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/terms/legal-document-page"
import { PrivacyContent } from "@/components/terms/legal-content"

const title = "개인정보처리방침"
const description =
  "센드베이스가 처리하는 정보, 이용 목적, 보관과 파기 및 이용자의 권리를 안내합니다."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title,
    description,
    url: "/privacy",
    locale: "ko_KR",
    siteName: "센드베이스",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Sendbase",
      },
    ],
  },
}

export default function PrivacyPage() {
  return (
    <LegalDocumentPage title={title} current="privacy">
      <PrivacyContent />
    </LegalDocumentPage>
  )
}
