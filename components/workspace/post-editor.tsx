"use client"

import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { EditorContent, useEditor } from "@tiptap/react"
import Image from "@tiptap/extension-image"
import LinkExtension from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import StarterKit from "@tiptap/starter-kit"
import { toast } from "sonner"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ImagePlusIcon,
  ItalicIcon,
  Link2Icon,
  LoaderCircleIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"

import {
  getPostDetailAction,
  publishPostAction,
  recordExtensionResultAction,
  uploadPostImageAction,
} from "@/app/actions/posts"
import { PlatformLogo } from "@/components/logos/platform-logo"
import { usePostHistory } from "@/components/workspace/post-history"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { publishPlatforms } from "@/lib/types"

const selectedPlatformsStorageKey = "sendbase:selected-post-platforms"

const platformToggleTone: Record<PublishPlatform, string> = {
  threads: "bg-platform-threads text-white",
  x: "bg-platform-x text-white",
  discord: "bg-platform-discord text-white",
  naver_cafe: "bg-platform-naver-cafe text-white",
  soop: "bg-platform-soop text-white",
}

function readSavedDestinations(): PublishPlatform[] | null {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(selectedPlatformsStorageKey) ?? "null"
    )

    if (!Array.isArray(value)) return null

    const platformSet = new Set<PublishPlatform>()
    for (const platform of value) {
      if (
        typeof platform === "string" &&
        publishPlatforms.includes(platform as PublishPlatform)
      ) {
        platformSet.add(platform as PublishPlatform)
      }
    }

    return Array.from(platformSet)
  } catch {
    return null
  }
}

function saveDestinations(destinations: PublishPlatform[]) {
  try {
    window.localStorage.setItem(
      selectedPlatformsStorageKey,
      JSON.stringify(destinations)
    )
  } catch {
    // Browsers can deny storage access in private or restricted contexts.
  }
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
  const { addPost } = usePostHistory()
  const defaultDestinations = useMemo(
    () =>
      connections.filter((item) => item.connected).map((item) => item.platform),
    [connections]
  )
  const connected = useMemo(
    () => new Set(defaultDestinations),
    [defaultDestinations]
  )
  const [plainText, setPlainText] = useState("")
  const [imageCount, setImageCount] = useState(0)
  const [isDestinationsReady, setIsDestinationsReady] = useState(false)
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

  useLayoutEffect(() => {
    const savedDestinations = readSavedDestinations()
    if (savedDestinations === null) {
      saveDestinations(defaultDestinations)
    } else {
      reset((values) => ({
        ...values,
        destinations: savedDestinations.filter((platform) =>
          connected.has(platform)
        ),
      }))
    }

    setIsDestinationsReady(true)
  }, [connected, defaultDestinations, reset])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
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
    try {
      const form = new FormData()
      form.set("file", file)
      const { url } = await uploadPostImageAction(form)
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이미지를 첨부하지 못했습니다."
      )
    }
  }

  const publish = handleSubmit((values) => {
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
                  message:
                    "센드베이스 게시글 플러그인이 설치되어 있지 않습니다.",
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
        const post = await getPostDetailAction(result.postId)
        if (post) addPost(post)
        const failures = result.results.filter((item) => !item.ok)
        const message =
          failures.length > 0
            ? `${result.results.length - failures.length}곳 게시 완료 · ${failures.length}곳 확인 필요`
            : "선택한 플랫폼에 게시 요청을 완료했습니다."

        if (failures.length > 0) {
          toast.error(message)
        } else {
          toast.success(message)
        }
        reset({
          title: "",
          contentHtml: "<p></p>",
          destinations: values.destinations,
        })
        editor?.commands.setContent("<p></p>")
        setPlainText("")
        setImageCount(0)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "게시하지 못했습니다."
        )
      }
    })
  })

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Controller
        control={control}
        name="destinations"
        render={({ field }) => (
          <div className="mb-4">
            <div
              className={cn(
                "flex flex-wrap gap-2",
                !isDestinationsReady && "invisible"
              )}
            >
              {(Object.keys(platformLimits) as PublishPlatform[]).map(
                (platform) => {
                  const selected = field.value.includes(platform)
                  const isConnected = connected.has(platform)

                  return (
                    <button
                      key={platform}
                      type="button"
                      disabled={!isConnected}
                      aria-pressed={selected}
                      aria-label={platformLimits[platform].label}
                      onClick={() => {
                        const destinations = selected
                          ? field.value.filter((item) => item !== platform)
                          : [...field.value, platform]
                        field.onChange(destinations)
                        saveDestinations(destinations)
                      }}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                        selected
                          ? platformToggleTone[platform]
                          : "bg-card hover:bg-muted",
                        !isConnected && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <PlatformLogo
                        platform={platform}
                        color={selected ? "currentColor" : undefined}
                        className="size-4"
                      />
                    </button>
                  )
                }
              )}
            </div>
            {errors.destinations ? (
              <p className="mt-2 text-xs text-destructive">
                {errors.destinations.message}
              </p>
            ) : null}
          </div>
        )}
      />

      <Card radius="top" className="gap-0 py-0">
        <div className="px-7 pt-6 sm:px-10 sm:pt-8">
          <Input
            {...register("title")}
            aria-invalid={Boolean(errors.title)}
            placeholder="게시물 제목"
            className="h-auto rounded-none border-0 bg-transparent px-0 py-2 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-2xl dark:bg-transparent"
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
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenterIcon />
          </ToolbarButton>
          <ToolbarButton
            label="오른쪽 정렬"
            active={editor?.isActive({ textAlign: "right" })}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRightIcon />
          </ToolbarButton>
        </div>
        <EditorContent
          editor={editor}
          className="[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        />
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-5 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {selectedDestinations.map((platform) => {
              const limit = platformLimits[platform]
              const count = countCharacters(platform, plainText)
              const invalid =
                Boolean(limit.maxCharacters && count > limit.maxCharacters) ||
                Boolean(limit.maxImages && imageCount > limit.maxImages)

              return (
                <span
                  key={platform}
                  className={invalid ? "text-destructive" : undefined}
                >
                  {limit.label}{" "}
                  {limit.maxCharacters
                    ? `${count}/${limit.maxCharacters}자`
                    : "글자 수 제한 없음"}
                  {limit.maxImages
                    ? ` · 이미지 ${imageCount}/${limit.maxImages}`
                    : ""}
                </span>
              )
            })}
            {selectedDestinations.length === 0 ? (
              <span>플랫폼을 선택해 주세요.</span>
            ) : null}
            <span>
              이미지 {imageCount}개 · 링크 {countLinks(plainText)}개 ·{" "}
              {Array.from(plainText).length.toLocaleString("ko-KR")}자
            </span>
          </div>
          <Button
            className="h-10 shadow-sm"
            onClick={publish}
            disabled={isPublishing}
          >
            <span>공지 작성하기</span>
            {isPublishing ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : null}
          </Button>
        </div>
      </Card>
    </div>
  )
}
