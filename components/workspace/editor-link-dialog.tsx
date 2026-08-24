"use client"

import { useEffect, useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  editorLinkFormSchema,
  type EditorLinkFormValues,
} from "@/lib/posts/editor-link"

export function EditorLinkDialog({
  open,
  hasSelectedText,
  canRemove,
  initialValues,
  onOpenChange,
  onSubmit,
  onRemove,
}: {
  open: boolean
  hasSelectedText: boolean
  canRemove: boolean
  initialValues: EditorLinkFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EditorLinkFormValues) => void
  onRemove: () => void
}) {
  const formId = useId()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditorLinkFormValues>({
    resolver: zodResolver(editorLinkFormSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) reset(initialValues)
  }, [initialValues, open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{canRemove ? "링크 편집" : "링크 추가"}</DialogTitle>
          <DialogDescription>
            {hasSelectedText
              ? "선택한 텍스트에 연결할 웹 주소를 입력해 주세요."
              : "웹 주소를 입력하고 필요하면 표시 텍스트를 바꿔 주세요."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Field data-invalid={Boolean(errors.url)}>
            <FieldLabel htmlFor="editor-link-url">링크</FieldLabel>
            <Input
              id="editor-link-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              autoFocus
              aria-invalid={Boolean(errors.url)}
              placeholder="https://example.com"
              {...register("url")}
            />
            <FieldError errors={[errors.url]} />
          </Field>
          {!hasSelectedText ? (
            <Field data-invalid={Boolean(errors.text)}>
              <FieldLabel htmlFor="editor-link-text">
                표시 텍스트(선택)
              </FieldLabel>
              <Input
                id="editor-link-text"
                autoComplete="off"
                aria-invalid={Boolean(errors.text)}
                placeholder="입력하지 않으면 링크를 그대로 표시"
                {...register("text")}
              />
              <FieldError errors={[errors.text]} />
            </Field>
          ) : null}
        </form>
        <DialogFooter className={canRemove ? "sm:justify-between" : undefined}>
          {canRemove ? (
            <Button type="button" variant="ghost" onClick={onRemove}>
              링크 제거
            </Button>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" form={formId}>
              적용
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
