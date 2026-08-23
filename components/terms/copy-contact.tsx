"use client"

import { toast } from "sonner"

type Contact = "email" | "phone"

const contacts: Record<Contact, { label: string; value: string }> = {
  email: { label: "이메일", value: "contact@workbase.im" },
  phone: { label: "전화번호", value: "010-8346-6711" },
}

export function CopyContact() {
  async function copyContact(contact: Contact) {
    try {
      await navigator.clipboard.writeText(contacts[contact].value)
      toast.success(`${contacts[contact].label}을 복사했습니다.`)
    } catch {
      toast.error("복사하지 못했습니다. 다시 시도해 주세요.")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => copyContact("email")}
        className="underline underline-offset-4 hover:text-muted-foreground"
      >
        {contacts.email.value}
      </button>{" "}
      |{" "}
      <button
        type="button"
        onClick={() => copyContact("phone")}
        className="underline underline-offset-4 hover:text-muted-foreground"
      >
        {contacts.phone.value}
      </button>
    </>
  )
}
