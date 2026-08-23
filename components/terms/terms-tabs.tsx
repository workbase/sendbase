"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TermsTabs({
  terms,
  privacy,
}: Readonly<{ terms: React.ReactNode; privacy: React.ReactNode }>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const value = searchParams.get("tab") === "privacy" ? "privacy" : "terms"

  function handleValueChange(nextValue: string | number) {
    router.push(nextValue === "privacy" ? "/terms?tab=privacy" : "/terms")
  }

  return (
    <Tabs value={value} onValueChange={handleValueChange}>
      <TabsList variant="line" aria-label="약관 문서">
        <TabsTrigger value="terms">이용 약관</TabsTrigger>
        <TabsTrigger value="privacy">개인정보처리방침</TabsTrigger>
      </TabsList>
      <TabsContent value="terms" className="pt-8">
        {terms}
      </TabsContent>
      <TabsContent value="privacy" className="pt-8">
        {privacy}
      </TabsContent>
    </Tabs>
  )
}
