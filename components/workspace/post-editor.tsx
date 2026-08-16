"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { EditorContent, useEditor } from "@tiptap/react"
import Image from "@tiptap/extension-image"
import LinkExtension from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import StarterKit from "@tiptap/starter-kit"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ImagePlusIcon,
  ItalicIcon,
  Link2Icon,
  LoaderCircleIcon,
  SendIcon,
  SettingsIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"

import {
  publishPostAction,
  recordExtensionResultAction,
  uploadPostImageAction,
} from "@/app/actions/posts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  countCharacters,
  countLinks,
  platformLimits,
} from "@/lib/platforms/limits"
import { postFormSchema, type PostFormValues } from "@/lib/posts/schema"
import type {
  ExtensionPublishJob,
  PlatformConnection,
  PublishPlatform,
} from "@/lib/types"

const platformTone: Record<PublishPlatform, string> = {
  threads: "bg-foreground text-background",
  x: "bg-foreground text-background",
  discord: "bg-indigo-600 text-white",
  naver_cafe: "bg-emerald-500 text-white",
  soop: "bg-sky-500 text-white",
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function extensionCheck() {
  return new Promise<boolean>((resolve) => {
    const requestId = crypto.randomUUID()
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", listener)
      resolve(false)
    }, 1_500)
    const listener = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as Record<string, unknown> | null
      if (
        !data ||
        data.type !== "SENDBASE_EXTENSION_CHECK_RESULT" ||
        data.requestId !== requestId
      )
        return
      window.clearTimeout(timeout)
      window.removeEventListener("message", listener)
      resolve(data.installed === true)
    }
    window.addEventListener("message", listener)
    window.postMessage(
      { source: "SENDBASE_SAAS", type: "SENDBASE_EXTENSION_CHECK", requestId },
      window.location.origin
    )
  })
}

function runExtensionJob(job: ExtensionPublishJob) {
  return new Promise<{ ok: boolean; message: string; url?: string }>(
    (resolve) => {
      const resultType =
        job.platform === "naver_cafe"
          ? "SENDBASE_NAVER_CAFE_AUTOWRITE_RESULT"
          : "SENDBASE_SOOP_AUTOWRITE_RESULT"
      const completedUrlType =
        job.platform === "naver_cafe"
          ? "SENDBASE_NAVER_CAFE_AUTOWRITE_COMPLETED_URL"
          : "SENDBASE_SOOP_AUTOWRITE_COMPLETED_URL"
      let successfulResult: { ok: true; message: string } | null = null
      let completedUrl: string | null = null

      const cleanup = () => {
        window.clearTimeout(timeout)
        window.removeEventListener("message", listener)
      }

      const finishIfComplete = () => {
        if (!successfulResult || !completedUrl) return
        cleanup()
        resolve({ ...successfulResult, url: completedUrl })
      }

      const timeout = window.setTimeout(() => {
        cleanup()
        resolve(
          successfulResult ?? {
            ok: false,
            message: "확장 프로그램 응답 시간이 초과되었습니다.",
          }
        )
      }, 120_000)
      const listener = (event: MessageEvent<unknown>) => {
        if (event.origin !== window.location.origin) return
        const data = event.data as Record<string, unknown> | null
        if (!data || data.requestId !== job.requestId) return

        if (data.type === completedUrlType && typeof data.url === "string") {
          completedUrl = data.url
          finishIfComplete()
          return
        }

        if (data.type !== resultType) return
        const result = data.result as Record<string, unknown> | undefined
        const message =
          typeof result?.message === "string"
            ? result.message
            : typeof result?.error === "string"
              ? result.error
              : "자동 작성 결과를 확인해 주세요."
        if (result?.ok !== true) {
          cleanup()
          resolve({ ok: false, message })
          return
        }
        successfulResult = { ok: true, message }
        finishIfComplete()
      }
      window.addEventListener("message", listener)
      window.postMessage(
        {
          source: "SENDBASE_SAAS",
          type: job.messageType,
          requestId: job.requestId,
          payload: job.payload,
        },
        window.location.origin
      )
    }
  )
}

export function PostEditor({
  connections,
}: {
  connections: PlatformConnection[]
}) {
  const connected = new Set(
    connections.filter((item) => item.connected).map((item) => item.platform)
  )
  const defaultDestinations = Array.from(connected)
  const [plainText, setPlainText] = useState("")
  const [imageCount, setImageCount] = useState(0)
  const [notice, setNotice] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [isPublishing, startPublishing] = useTransition()
  const imageInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: "",
      contentHtml: "<p></p>",
      destinations: defaultDestinations,
    },
  })
  const selectedDestinations = useWatch({ control, name: "destinations" })

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image.configure({ allowBase64: false, inline: false }),
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right"],
      }),
      Placeholder.configure({
        placeholder: "여러 플랫폼에 전할 이야기를 작성해 보세요…",
      }),
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-80 px-7 py-6 text-base leading-8 outline-none sm:min-h-96 sm:px-10 sm:py-8 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-6 [&_img]:max-h-96 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:object-contain [&_p]:my-2",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      setValue("contentHtml", html, { shouldDirty: true, shouldValidate: true })
      setPlainText(currentEditor.getText({ blockSeparator: "\n" }))
      setImageCount((html.match(/<img\b/g) ?? []).length)
    },
  })

  function applyLink() {
    if (!editor) return
    const previous = editor.getAttributes("link").href as string | undefined
    const url = window.prompt(
      "연결할 URL을 입력해 주세요.",
      previous ?? "https://"
    )
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run()
  }

  async function attachImage(file: File) {
    setNotice(null)
    try {
      const form = new FormData()
      form.set("file", file)
      const { url } = await uploadPostImageAction(form)
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "이미지를 첨부하지 못했습니다.",
      })
    }
  }

  const publish = handleSubmit((values) => {
    setNotice(null)
    startPublishing(async () => {
      try {
        const result = await publishPostAction(values)
        if (result.extensionJobs.length > 0) {
          const installed = await extensionCheck()
          if (!installed) {
            await Promise.all(
              result.extensionJobs.map((job) =>
                recordExtensionResultAction({
                  postId: result.postId,
                  platform: job.platform,
                  ok: false,
                  message: "센드베이스 게시글 플러그인이 설치되어 있지 않습니다.",
                })
              )
            )
          } else {
            await Promise.all(
              result.extensionJobs.map(async (job) => {
                const extensionResult = await runExtensionJob(job)
                await recordExtensionResultAction({
                  postId: result.postId,
                  platform: job.platform,
                  ...extensionResult,
                })
              })
            )
          }
        }
        const failures = result.results.filter((item) => !item.ok)
        setNotice({
          type: failures.length > 0 ? "error" : "success",
          text:
            failures.length > 0
              ? `${result.results.length - failures.length}곳 게시 완료 · ${failures.length}곳 확인 필요`
              : "선택한 플랫폼에 게시 요청을 완료했습니다.",
        })
        reset({
          title: "",
          contentHtml: "<p></p>",
          destinations: defaultDestinations,
        })
        editor?.commands.setContent("<p></p>")
        setPlainText("")
        setImageCount(0)
      } catch (error) {
        setNotice({
          type: "error",
          text: error instanceof Error ? error.message : "게시하지 못했습니다.",
        })
      }
    })
  })

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <main className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">새 게시물</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              한 번 작성하고 연결한 채널에 함께 게시하세요.
            </p>
          </div>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <div className="px-7 pt-6 sm:px-10 sm:pt-8">
            <Input
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              placeholder="게시물 제목"
              className="h-auto rounded-none border-0 px-0 py-2 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-2xl"
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.title.message}
              </p>
            ) : null}
          </div>
          <Separator className="mt-4" />
          <div className="flex flex-wrap items-center gap-0.5 border-b px-3 py-2 sm:px-6">
            <ToolbarButton
              label="굵게"
              active={editor?.isActive("bold")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton
              label="기울임"
              active={editor?.isActive("italic")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton
              label="밑줄"
              active={editor?.isActive("underline")}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon />
            </ToolbarButton>
            <ToolbarButton
              label="취소선"
              active={editor?.isActive("strike")}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <StrikethroughIcon />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton
              label="링크"
              active={editor?.isActive("link")}
              onClick={applyLink}
            >
              <Link2Icon />
            </ToolbarButton>
            <ToolbarButton
              label="이미지 첨부"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlusIcon />
            </ToolbarButton>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void attachImage(file)
                event.target.value = ""
              }}
            />
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton
              label="왼쪽 정렬"
              active={editor?.isActive({ textAlign: "left" })}
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeftIcon />
            </ToolbarButton>
            <ToolbarButton
              label="가운데 정렬"
              active={editor?.isActive({ textAlign: "center" })}
              onClick={() =>
                editor?.chain().focus().setTextAlign("center").run()
              }
            >
              <AlignCenterIcon />
            </ToolbarButton>
            <ToolbarButton
              label="오른쪽 정렬"
              active={editor?.isActive({ textAlign: "right" })}
              onClick={() =>
                editor?.chain().focus().setTextAlign("right").run()
              }
            >
              <AlignRightIcon />
            </ToolbarButton>
          </div>
          <EditorContent
            editor={editor}
            className="[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
          />
          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground sm:px-8">
            <span>
              이미지 {imageCount}개 · 링크 {countLinks(plainText)}개
            </span>
            <span>
              {Array.from(plainText).length.toLocaleString("ko-KR")}자
            </span>
          </div>
        </Card>

        {notice ? (
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              notice.type === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
            )}
          >
            {notice.type === "success" ? (
              <CheckCircle2Icon className="size-4" />
            ) : null}
            {notice.text}
          </div>
        ) : null}
      </main>

      <aside className="space-y-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>게시할 곳</CardTitle>
            <p className="text-xs text-muted-foreground">
              연결된 플랫폼을 선택하세요.
            </p>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="destinations"
              render={({ field }) => (
                <div className="space-y-2">
                  {(Object.keys(platformLimits) as PublishPlatform[]).map(
                    (platform) => {
                      const limit = platformLimits[platform]
                      const selected = field.value.includes(platform)
                      const isConnected = connected.has(platform)
                      return (
                        <button
                          key={platform}
                          type="button"
                          disabled={!isConnected}
                          onClick={() =>
                            field.onChange(
                              selected
                                ? field.value.filter(
                                    (item) => item !== platform
                                  )
                                : [...field.value, platform]
                            )
                          }
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                            selected
                              ? "border-foreground/30 bg-muted"
                              : "hover:bg-muted/60",
                            !isConnected && "cursor-not-allowed opacity-50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                              platformTone[platform]
                            )}
                          >
                            {limit.shortLabel}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {limit.label}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {isConnected
                                ? selected
                                  ? "선택됨"
                                  : "연결됨"
                                : "연결 필요"}
                            </span>
                          </span>
                          {selected ? (
                            <CheckCircle2Icon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      )
                    }
                  )}
                </div>
              )}
            />
            {errors.destinations ? (
              <p className="mt-2 text-xs text-destructive">
                {errors.destinations.message}
              </p>
            ) : null}
            <Button
              render={<Link href="/settings" />}
              nativeButton={false}
              variant="ghost"
              className="mt-2 w-full text-muted-foreground"
            >
              <SettingsIcon /> 연결 관리
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>플랫폼 제한</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDestinations.map((platform) => {
              const limit = platformLimits[platform]
              const count = countCharacters(platform, plainText)
              const invalid =
                Boolean(limit.maxCharacters && count > limit.maxCharacters) ||
                Boolean(limit.maxImages && imageCount > limit.maxImages)
              return (
                <div key={platform} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{limit.label}</span>
                    <span
                      className={
                        invalid ? "text-destructive" : "text-muted-foreground"
                      }
                    >
                      {limit.maxCharacters
                        ? `${count}/${limit.maxCharacters}자`
                        : `${count}자`}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {limit.maxImages
                      ? `이미지 ${imageCount}/${limit.maxImages} · `
                      : ""}
                    {limit.note}
                  </p>
                </div>
              )
            })}
            {selectedDestinations.length === 0 ? (
              <p className="text-xs leading-5 text-muted-foreground">
                플랫폼을 선택하면 글자·이미지 제한을 확인할 수 있습니다.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Button
          className="h-11 w-full shadow-sm"
          onClick={publish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <SendIcon />
          )}
          {isPublishing ? "게시하는 중…" : "선택한 곳에 게시"}
        </Button>
      </aside>
    </div>
  )
}
