"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  EditorContent,
  Extension,
  type Editor as TiptapEditor,
  useEditor,
  useEditorState,
} from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
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
  ArrowRightIcon,
  BoldIcon,
  ImagePlusIcon,
  ItalicIcon,
  Link2Icon,
  LoaderCircleIcon,
  PlusIcon,
  StrikethroughIcon,
  UnderlineIcon,
  XIcon,
} from "lucide-react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"

import {
  getPostDetailAction,
  publishApiDestinationsAction,
  publishPostAction,
  recordExtensionResultsAction,
  uploadPostImageAction,
} from "@/app/actions/posts"
import { PlatformLogo } from "@/components/logos/platform-logo"
import { EditorLinkDialog } from "@/components/workspace/editor-link-dialog"
import { usePostHistory } from "@/components/workspace/post-history"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getStoredExtensionInstallation } from "@/lib/browser/extension-installation"
import { cn } from "@/lib/utils"
import { countCharacters, platformLimits } from "@/lib/platforms/limits"
import {
  platformStatusTone,
  platformToggleTone,
} from "@/lib/platforms/toggle-tone"
import {
  normalizeEditorLinkUrl,
  type EditorLinkFormValues,
} from "@/lib/posts/editor-link"
import {
  editorHtmlToDiscordCounterText,
  editorHtmlToSocialCounterText,
  mergeEditorHtml,
} from "@/lib/posts/editor-output"
import {
  isPostImageMimeType,
  postImageAccept,
  POST_IMAGE_MAX_BYTES,
} from "@/lib/posts/image-constraints"
import {
  postFormSchema,
  requiresPostTitle,
  type PostFormValues,
} from "@/lib/posts/schema"
import type {
  ExtensionPublishJob,
  PlatformConnection,
  PostHistoryItem,
  PublishDestinationResult,
  PublishPlatform,
} from "@/lib/types"
import { publishPlatforms } from "@/lib/types"

const selectedPlatformsStorageKey = "sendbase:selected-post-platforms"
const landingEditorTitle = "내 방송을 놓치는 팬이 없도록"
const landingEditorContentHtml =
  "<p>내 방송 공지는 정말 시청자를 모으고 있나요?</p><p>열성 팬들만 보는 곳에 쓰고 있진 않나요?</p><p> </p><p>알림을 안 켜둔 시청자도, 팬카페에 없는 팬도 나를 놓치지 않게.</p><p>방송에 들어오기만을 기다리는 대신, 팬들의 피드에 자연스럽게 스며드세요.</p><p>완전 무료. 개인정보는 애초에 받지 않아요.</p>"
const landingDefaultDestinations: PublishPlatform[] = [
  "threads",
  "x",
  "discord",
]
const loginProviders = [
  { id: "chzzk", label: "치지직으로 계속하기" },
  { id: "soop", label: "SOOP으로 계속하기" },
  { id: "cime", label: "씨미로 계속하기" },
] as const

const ResetMarksOnEnter = Extension.create({
  name: "resetMarksOnEnter",
  priority: 1_000,
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitBlock({ keepMarks: false }),
    }
  },
})

const NonInclusiveLink = LinkExtension.extend({
  inclusive: false,
})

const OptimizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
      },
      "data-thumbnail-src": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-thumbnail-src"),
      },
    }
  },
})

const editorContentClassName =
  "min-h-[min(20rem,33.333dvh)] px-7 py-4 text-base leading-8 outline-none sm:min-h-[min(24rem,33.333dvh)] sm:px-10 sm:py-5 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-6 [&_img]:h-auto [&_img]:w-auto [&_img]:max-h-96 [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-2"
const replyEditorContentClassName =
  "min-h-40 px-7 py-4 text-base leading-8 outline-none sm:px-10 sm:py-5 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-6 [&_img]:h-auto [&_img]:w-auto [&_img]:max-h-96 [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-2"
const editorContentWrapperClassName =
  "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground/60 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"

function createEditorExtensions(placeholder: string) {
  return [
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
    ResetMarksOnEnter,
    Underline,
    NonInclusiveLink.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
    }),
    OptimizedImage.configure({ allowBase64: false, inline: false }),
    TextAlign.configure({
      types: ["paragraph"],
      alignments: ["left", "center", "right"],
    }),
    Placeholder.configure({ placeholder }),
  ]
}

type LinkDialogState = {
  open: boolean
  from: number
  to: number
  hasSelectedText: boolean
  canRemove: boolean
  values: EditorLinkFormValues
}

const initialLinkDialogState: LinkDialogState = {
  open: false,
  from: 0,
  to: 0,
  hasSelectedText: false,
  canRemove: false,
  values: { text: "", url: "https://" },
}

function subscribeToHydration() {
  return () => undefined
}

function getClientHydrationSnapshot() {
  return true
}

function getServerHydrationSnapshot() {
  return false
}

function getClientLoginErrorSnapshot() {
  return new URLSearchParams(window.location.search).get("error") ?? undefined
}

function getServerLoginErrorSnapshot() {
  return undefined
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

function runExtensionJob(job: ExtensionPublishJob) {
  return new Promise<{
    ok: boolean
    message: string
    url?: string
  }>((resolve) => {
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
      resolve({
        ...successfulResult,
        url: completedUrl,
      })
    }

    const timeout = window.setTimeout(() => {
      cleanup()
      resolve({
        ...(successfulResult ?? {
          ok: false,
          message: "확장 프로그램 응답 시간이 초과되었습니다.",
        }),
      })
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
  })
}

async function publishExtensionJobs(
  postId: string,
  jobs: ExtensionPublishJob[]
): Promise<PublishDestinationResult[]> {
  const completedJobs = await Promise.all(
    jobs.map(async (job) => ({
      platform: job.platform,
      ...(await runExtensionJob(job)),
    }))
  )
  await recordExtensionResultsAction({ postId, results: completedJobs })
  return completedJobs.map(({ platform, ok, message }) => ({
    platform,
    ok,
    message,
  }))
}

function CharacterUsageRing({
  characterCount,
  maxCharacters,
}: {
  characterCount: number
  maxCharacters: number
}) {
  const percentage = Math.min(100, (characterCount / maxCharacters) * 100)
  const isOverLimit = characterCount > maxCharacters

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0 -rotate-90"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="2.5"
        className={isOverLimit ? "stroke-destructive/20" : "stroke-current/20"}
      />
      {percentage > 0 ? (
        <circle
          cx="8"
          cy="8"
          r="6"
          pathLength="100"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${percentage} 100`}
          className={isOverLimit ? "stroke-destructive" : "stroke-current"}
        />
      ) : null}
    </svg>
  )
}

type CharacterLimitInfo = {
  platform: PublishPlatform
  maxCharacters: number
  characterCount: number
}

function getMostConstrainedCharacterLimit(
  contentHtml: string,
  destinations: readonly PublishPlatform[],
  title = ""
): CharacterLimitInfo | null {
  const socialText = editorHtmlToSocialCounterText(contentHtml)
  const discordText = editorHtmlToDiscordCounterText(contentHtml)
  const discordContent = title ? `**${title}**\n\n${discordText}` : discordText
  let mostConstrained: CharacterLimitInfo | null = null

  for (const platform of destinations) {
    const maxCharacters = platformLimits[platform].maxCharacters
    if (maxCharacters === null) continue

    const characterCount = countCharacters(
      platform,
      platform === "discord" ? discordContent : socialText
    )
    if (
      mostConstrained === null ||
      characterCount / maxCharacters >
        mostConstrained.characterCount / mostConstrained.maxCharacters
    ) {
      mostConstrained = { platform, maxCharacters, characterCount }
    }
  }

  return mostConstrained
}

function selectMostConstrainedCharacterLimit(
  ...limits: Array<CharacterLimitInfo | null>
) {
  let mostConstrained: CharacterLimitInfo | null = null
  for (const limit of limits) {
    if (
      limit &&
      (mostConstrained === null ||
        limit.characterCount / limit.maxCharacters >
          mostConstrained.characterCount / mostConstrained.maxCharacters)
    ) {
      mostConstrained = limit
    }
  }
  return mostConstrained
}

function CharacterLimitStatus({
  destinations,
  limit,
}: {
  destinations: readonly PublishPlatform[]
  limit: CharacterLimitInfo | null
}) {
  if (destinations.length === 0) return <span>플랫폼을 선택해 주세요.</span>
  if (!limit) return <span>글자 수 제한 없음</span>

  return (
    <span
      className={cn(
        "flex items-center gap-1.5",
        limit.characterCount > limit.maxCharacters
          ? "text-destructive"
          : undefined
      )}
    >
      <CharacterUsageRing
        characterCount={limit.characterCount}
        maxCharacters={limit.maxCharacters}
      />
      {platformLimits[limit.platform].label} 기준 {limit.characterCount}/
      {limit.maxCharacters}자
    </span>
  )
}

function ThreadReplyEditor({
  editorId,
  index,
  contentHtml,
  errorMessage,
  limit,
  destinations,
  onChange,
  onFocus,
  onReady,
  onDestroy,
  onRemove,
  footerActions,
}: {
  editorId: string
  index: number
  contentHtml: string
  errorMessage?: string
  limit: CharacterLimitInfo | null
  destinations: readonly PublishPlatform[]
  onChange: (html: string) => void
  onFocus: (editor: TiptapEditor) => void
  onReady: (editorId: string, editor: TiptapEditor) => void
  onDestroy: (editorId: string, editor: TiptapEditor) => void
  onRemove: () => void
  footerActions?: React.ReactNode
}) {
  const onChangeRef = useRef(onChange)
  const onFocusRef = useRef(onFocus)

  useLayoutEffect(() => {
    onChangeRef.current = onChange
    onFocusRef.current = onFocus
  }, [onChange, onFocus])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions("답글을 작성해 보세요…"),
    content: contentHtml,
    editorProps: { attributes: { class: replyEditorContentClassName } },
    onFocus: ({ editor: currentEditor }) => onFocusRef.current(currentEditor),
    onUpdate: ({ editor: currentEditor }) =>
      onChangeRef.current(currentEditor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    onReady(editorId, editor)
    const focusFrame = requestAnimationFrame(() => editor.commands.focus("end"))
    return () => {
      cancelAnimationFrame(focusFrame)
      onDestroy(editorId, editor)
    }
  }, [editor, editorId, onDestroy, onReady])

  useEffect(() => {
    if (editor && editor.getHTML() !== contentHtml) {
      editor.commands.setContent(contentHtml, { emitUpdate: false })
    }
  }, [contentHtml, editor])

  return (
    <section className="border-t" aria-label={`답글 ${index + 1}`}>
      <div className="flex items-center justify-between px-7 pt-10 sm:px-10">
        <span className="text-sm font-medium text-muted-foreground">
          답글 {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label={`답글 ${index + 1} 삭제`}
          onClick={onRemove}
        >
          <XIcon />
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className={cn("min-h-40", editorContentWrapperClassName)}
      />
      <div className="flex flex-wrap items-end justify-between gap-3 px-7 pt-2 pb-10 sm:px-10">
        <div className="text-xs text-muted-foreground">
          <CharacterLimitStatus destinations={destinations} limit={limit} />
          {errorMessage ? (
            <p className="mt-2 text-destructive">{errorMessage}</p>
          ) : null}
        </div>
        {footerActions}
      </div>
    </section>
  )
}

export function PostEditor({
  connections,
  loginError,
  mode = "dashboard",
}: {
  connections: PlatformConnection[]
  loginError?: string
  mode?: "dashboard" | "landing"
}) {
  const postHistory = usePostHistory(mode === "landing")
  const connected = useMemo(
    () =>
      new Set(
        connections
          .filter((item) => item.connected)
          .map((item) => item.platform)
      ),
    [connections]
  )
  const defaultDestinations = useMemo(() => {
    if (mode === "landing") {
      return landingDefaultDestinations.filter((platform) =>
        connected.has(platform)
      )
    }

    return Array.from(connected)
  }, [connected, mode])
  const initialContentHtml =
    mode === "landing" ? landingEditorContentHtml : "<p></p>"
  const isDestinationsReady = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  )
  const urlLoginError = useSyncExternalStore(
    subscribeToHydration,
    getClientLoginErrorSnapshot,
    getServerLoginErrorSnapshot
  )
  const effectiveLoginError = loginError ?? urlLoginError
  const [isPublishing, startPublishing] = useTransition()
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>(
    initialLinkDialogState
  )
  const [activeEditor, setActiveEditor] = useState<TiptapEditor | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const previewImageUrlRef = useRef<string | null>(null)
  const linkEditorRef = useRef<TiptapEditor | null>(null)
  const replyEditorsRef = useRef(new Map<string, TiptapEditor>())

  useEffect(() => {
    return () => {
      if (previewImageUrlRef.current) {
        URL.revokeObjectURL(previewImageUrlRef.current)
      }
    }
  }, [])

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
      title: mode === "landing" ? landingEditorTitle : "",
      contentHtml: initialContentHtml,
      destinations: defaultDestinations,
      threadReplies: [],
    },
  })
  const {
    fields: threadReplyFields,
    append: appendThreadReply,
    remove: removeThreadReply,
    replace: replaceThreadReplies,
  } = useFieldArray({ control, name: "threadReplies" })
  const title = useWatch({ control, name: "title" })
  const contentHtml = useWatch({ control, name: "contentHtml" })
  const selectedDestinations = useWatch({ control, name: "destinations" })
  const threadReplies = useWatch({ control, name: "threadReplies" })
  const shouldShowTitle = requiresPostTitle(selectedDestinations)
  const threadDestinations = useMemo(
    () =>
      selectedDestinations.filter(
        (platform): platform is "threads" | "x" =>
          platform === "threads" || platform === "x"
      ),
    [selectedDestinations]
  )
  const nonThreadDestinations = useMemo(
    () =>
      selectedDestinations.filter(
        (platform) => platform !== "threads" && platform !== "x"
      ),
    [selectedDestinations]
  )
  const mergedContentHtml = useMemo(
    () =>
      mergeEditorHtml([
        contentHtml,
        ...threadReplies.map((reply) => reply.contentHtml),
      ]),
    [contentHtml, threadReplies]
  )
  const mostConstrainedCharacterLimit = useMemo(
    () =>
      selectMostConstrainedCharacterLimit(
        getMostConstrainedCharacterLimit(contentHtml, threadDestinations),
        getMostConstrainedCharacterLimit(
          mergedContentHtml,
          nonThreadDestinations,
          title
        )
      ),
    [
      contentHtml,
      mergedContentHtml,
      nonThreadDestinations,
      threadDestinations,
      title,
    ]
  )
  const threadReplyCharacterLimits = useMemo(
    () =>
      threadReplies.map((reply) =>
        getMostConstrainedCharacterLimit(reply.contentHtml, threadDestinations)
      ),
    [threadDestinations, threadReplies]
  )

  useLayoutEffect(() => {
    if (mode === "landing") return

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
  }, [connected, defaultDestinations, mode, reset])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(
      "여러 플랫폼에 전할 이야기를 작성해 보세요…"
    ),
    content: initialContentHtml,
    onCreate: ({ editor: currentEditor }) => {
      if (mode === "landing") return
      setActiveEditor(currentEditor)

      requestAnimationFrame(() => {
        currentEditor.commands.focus("end")
      })
    },
    editorProps: {
      attributes: {
        class: editorContentClassName,
      },
    },
    onFocus: ({ editor: currentEditor }) => setActiveEditor(currentEditor),
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      setValue("contentHtml", html, { shouldDirty: true, shouldValidate: true })
    },
  })

  const editorState = useEditorState({
    editor: activeEditor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      link: currentEditor?.isActive("link") ?? false,
      alignLeft: currentEditor?.isActive({ textAlign: "left" }) ?? false,
      alignCenter: currentEditor?.isActive({ textAlign: "center" }) ?? false,
      alignRight: currentEditor?.isActive({ textAlign: "right" }) ?? false,
    }),
  })

  const loadPostIntoEditor = useCallback(
    async (post: PostHistoryItem) => {
      try {
        const detail = await getPostDetailAction(post.id)
        if (!detail) {
          toast.error("게시물을 찾을 수 없습니다.")
          return
        }
        const hasThreadDestination = detail.destinations.some(
          (platform) => platform === "threads" || platform === "x"
        )
        const contentHtml = hasThreadDestination
          ? detail.contentHtml
          : mergeEditorHtml([
              detail.contentHtml,
              ...detail.threadReplies.map((reply) => reply.contentHtml),
            ])
        reset({
          title: detail.editorTitle,
          contentHtml,
          destinations: detail.destinations,
          threadReplies: hasThreadDestination ? detail.threadReplies : [],
        })
        editor?.commands.setContent(contentHtml, { emitUpdate: false })
        requestAnimationFrame(() => {
          editor?.commands.focus("end")
          editorContainerRef.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
            block: "end",
          })
        })
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "게시물을 불러오지 못했습니다."
        )
      }
    },
    [editor, reset]
  )

  useEffect(() => {
    if (!postHistory) return

    postHistory.setPostLoader(loadPostIntoEditor)
    return () => postHistory.setPostLoader(null)
  }, [loadPostIntoEditor, postHistory])

  const registerReplyEditor = useCallback(
    (editorId: string, replyEditor: TiptapEditor) => {
      replyEditorsRef.current.set(editorId, replyEditor)
    },
    []
  )

  const unregisterReplyEditor = useCallback(
    (editorId: string, replyEditor: TiptapEditor) => {
      replyEditorsRef.current.delete(editorId)
      setActiveEditor((current) => (current === replyEditor ? editor : current))
    },
    [editor]
  )

  function deleteThreadReply(index: number, editorId: string) {
    const replyEditor = replyEditorsRef.current.get(editorId)
    if (replyEditor && activeEditor === replyEditor) setActiveEditor(editor)
    removeThreadReply(index)
  }

  function mergeThreadRepliesIntoMainEditor() {
    if (threadReplies.length === 0) return

    const mergedHtml = mergeEditorHtml([
      editor?.getHTML() ?? contentHtml,
      ...threadReplies.map((reply) => reply.contentHtml),
    ])
    setActiveEditor(editor)
    editor?.commands.setContent(mergedHtml, { emitUpdate: false })
    setValue("contentHtml", mergedHtml, {
      shouldDirty: true,
      shouldValidate: false,
    })
    replaceThreadReplies([])
  }

  function openLinkDialog() {
    const currentEditor = activeEditor ?? editor
    if (!currentEditor) return
    linkEditorRef.current = currentEditor

    const canRemove = currentEditor.isActive("link")
    if (canRemove && currentEditor.state.selection.empty) {
      currentEditor.commands.extendMarkRange("link")
    }

    const { from, to, empty } = currentEditor.state.selection
    const selectedText = empty
      ? ""
      : currentEditor.state.doc.textBetween(from, to, " ").trim()
    const hasSelectedText = selectedText.length > 0
    const href = currentEditor.getAttributes("link").href

    setLinkDialog({
      open: true,
      from,
      to,
      hasSelectedText,
      canRemove,
      values: {
        text: selectedText,
        url: typeof href === "string" ? href : "https://",
      },
    })
  }

  function closeLinkDialog(restoreSelection: boolean) {
    setLinkDialog((current) => ({ ...current, open: false }))
    const currentEditor = linkEditorRef.current
    if (!restoreSelection || !currentEditor) return

    requestAnimationFrame(() => {
      currentEditor
        .chain()
        .focus()
        .setTextSelection({ from: linkDialog.from, to: linkDialog.to })
        .run()
    })
  }

  function applyLink(values: EditorLinkFormValues) {
    const currentEditor = linkEditorRef.current
    if (!currentEditor) return

    const href = normalizeEditorLinkUrl(values.url)
    const chain = currentEditor
      .chain()
      .focus()
      .setTextSelection({ from: linkDialog.from, to: linkDialog.to })

    if (linkDialog.hasSelectedText) {
      chain.setLink({ href }).setTextSelection(linkDialog.to).run()
    } else {
      const text = values.text.trim() || values.url.trim()
      const linkEnd = linkDialog.from + text.length
      chain
        .insertContent(text)
        .setTextSelection({ from: linkDialog.from, to: linkEnd })
        .setLink({ href })
        .setTextSelection(linkEnd)
        .run()
    }

    closeLinkDialog(false)
  }

  function removeLink() {
    const currentEditor = linkEditorRef.current
    if (!currentEditor) return

    currentEditor
      .chain()
      .focus()
      .setTextSelection({ from: linkDialog.from, to: linkDialog.to })
      .unsetLink()
      .run()
    closeLinkDialog(false)
  }

  async function attachImage(file: File) {
    if (!isPostImageMimeType(file.type)) {
      toast.error("JPG, PNG, WebP, GIF 이미지만 첨부할 수 있습니다.")
      return
    }
    if (file.size > POST_IMAGE_MAX_BYTES) {
      toast.error("이미지는 10MB 이하여야 합니다.")
      return
    }

    if (mode === "landing") {
      if (previewImageUrlRef.current) {
        URL.revokeObjectURL(previewImageUrlRef.current)
      }
      const previewUrl = URL.createObjectURL(file)
      previewImageUrlRef.current = previewUrl
      ;(activeEditor ?? editor)
        ?.chain()
        .focus()
        .setImage({ src: previewUrl, alt: file.name })
        .run()
      return
    }

    try {
      const form = new FormData()
      form.set("file", file)
      const { url, thumbnailUrl, width, height } =
        await uploadPostImageAction(form)
      ;(activeEditor ?? editor)
        ?.chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: url,
            alt: file.name,
            width,
            height,
            "data-thumbnail-src": thumbnailUrl,
          },
        })
        .run()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이미지를 첨부하지 못했습니다."
      )
    }
  }

  const publish = handleSubmit((values) => {
    startPublishing(async () => {
      try {
        const requiresExtension = values.destinations.some(
          (platform) => platform === "naver_cafe" || platform === "soop"
        )
        if (requiresExtension && getStoredExtensionInstallation() !== true) {
          toast.error(
            "센드베이스 게시글 플러그인을 설치한 뒤 설정에서 설치 확인을 눌러 주세요."
          )
          return
        }

        const actionResult = await publishPostAction(values)
        if (!actionResult.ok) {
          toast.error(actionResult.error)
          return
        }

        const result = actionResult.data
        const [apiResults, extensionResults] = await Promise.all([
          result.apiPlatforms.length > 0
            ? publishApiDestinationsAction(result.postId)
            : Promise.resolve([]),
          result.extensionJobs.length > 0
            ? publishExtensionJobs(result.postId, result.extensionJobs)
            : Promise.resolve([]),
        ])
        const post = await getPostDetailAction(result.postId)
        if (post) postHistory?.addPost(post)
        const results = [...result.results, ...apiResults, ...extensionResults]
        const failures = results.filter((item) => !item.ok)
        const message =
          failures.length > 0
            ? `${results.length - failures.length}곳 게시 완료 · ${failures.length}곳 확인 필요`
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
          threadReplies: [],
        })
        editor?.commands.setContent("<p></p>")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "게시하지 못했습니다."
        )
      }
    })
  })

  const toolbarEditor = activeEditor ?? editor
  const dashboardActions =
    mode === "dashboard" ? (
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {threadDestinations.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            className="h-10 shadow-sm"
            disabled={isPublishing || threadReplyFields.length >= 25}
            onClick={() =>
              appendThreadReply(
                { contentHtml: "<p></p>" },
                { shouldFocus: false }
              )
            }
          >
            <PlusIcon />
            스레드 추가
          </Button>
        ) : null}
        <Button
          className="h-10 shadow-sm"
          onClick={publish}
          disabled={isPublishing}
        >
          <span>{isPublishing ? "1분 이내로 완료돼요" : "공지 작성하기"}</span>
          {isPublishing ? <LoaderCircleIcon className="animate-spin" /> : null}
        </Button>
      </div>
    ) : null

  return (
    <div ref={editorContainerRef} className="mx-auto w-full max-w-3xl">
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
                        const hasThreadDestination = destinations.some(
                          (destination) =>
                            destination === "threads" || destination === "x"
                        )
                        if (!hasThreadDestination) {
                          mergeThreadRepliesIntoMainEditor()
                        }
                        if (mode === "dashboard") {
                          saveDestinations(destinations)
                        }
                      }}
                      className={cn(
                        "relative flex size-10 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                        selected
                          ? platformToggleTone[platform]
                          : "bg-card hover:bg-muted",
                        !isConnected && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {selected ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute -top-3 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                            platformStatusTone[platform]
                          )}
                        />
                      ) : null}
                      <PlatformLogo
                        platform={platform}
                        color={selected ? "currentColor" : undefined}
                        className="size-5"
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

      <Card
        radius="top"
        className="relative z-10 gap-0 overflow-visible py-0 editor-card-uplight"
      >
        {shouldShowTitle ? (
          <div className="px-7 pt-6 pb-4 sm:px-10 sm:pt-8 sm:pb-5">
            <Input
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              placeholder="게시물 제목"
              className="h-auto rounded-none border-0 bg-transparent px-0 py-2 text-2xl font-semibold tracking-tight shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-2xl dark:bg-transparent"
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.title.message}
              </p>
            ) : null}
          </div>
        ) : null}
        {!shouldShowTitle ? (
          <div className="h-5 sm:h-8" aria-hidden="true" />
        ) : null}
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-0.5 bg-card/95 px-7 py-2 backdrop-blur-sm sm:px-10">
          <ToolbarButton
            label="굵게"
            active={editorState?.bold}
            onClick={() => toolbarEditor?.chain().focus().toggleBold().run()}
          >
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton
            label="기울임"
            active={editorState?.italic}
            onClick={() => toolbarEditor?.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarButton
            label="밑줄"
            active={editorState?.underline}
            onClick={() =>
              toolbarEditor?.chain().focus().toggleUnderline().run()
            }
          >
            <UnderlineIcon />
          </ToolbarButton>
          <ToolbarButton
            label="취소선"
            active={editorState?.strike}
            onClick={() => toolbarEditor?.chain().focus().toggleStrike().run()}
          >
            <StrikethroughIcon />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton
            label="링크"
            active={editorState?.link}
            onClick={openLinkDialog}
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
            accept={postImageAccept}
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
            active={editorState?.alignLeft}
            onClick={() =>
              toolbarEditor?.chain().focus().setTextAlign("left").run()
            }
          >
            <AlignLeftIcon />
          </ToolbarButton>
          <ToolbarButton
            label="가운데 정렬"
            active={editorState?.alignCenter}
            onClick={() =>
              toolbarEditor?.chain().focus().setTextAlign("center").run()
            }
          >
            <AlignCenterIcon />
          </ToolbarButton>
          <ToolbarButton
            label="오른쪽 정렬"
            active={editorState?.alignRight}
            onClick={() =>
              toolbarEditor?.chain().focus().setTextAlign("right").run()
            }
          >
            <AlignRightIcon />
          </ToolbarButton>
        </div>
        {toolbarEditor ? (
          <BubbleMenu
            editor={toolbarEditor}
            shouldShow={({ editor: currentEditor, from, to }) =>
              currentEditor.isEditable &&
              from !== to &&
              currentEditor.state.doc.textBetween(from, to, " ").trim().length >
                0
            }
            options={{
              placement: "top",
              offset: 12,
              flip: true,
              shift: { padding: 8 },
            }}
            className="z-50 flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md"
          >
            <ToolbarButton
              label="굵게"
              active={editorState?.bold}
              onClick={() => toolbarEditor.chain().focus().toggleBold().run()}
            >
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton
              label="기울임"
              active={editorState?.italic}
              onClick={() => toolbarEditor.chain().focus().toggleItalic().run()}
            >
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton
              label="밑줄"
              active={editorState?.underline}
              onClick={() =>
                toolbarEditor.chain().focus().toggleUnderline().run()
              }
            >
              <UnderlineIcon />
            </ToolbarButton>
            <ToolbarButton
              label="취소선"
              active={editorState?.strike}
              onClick={() => toolbarEditor.chain().focus().toggleStrike().run()}
            >
              <StrikethroughIcon />
            </ToolbarButton>
            <ToolbarButton
              label="링크"
              active={editorState?.link}
              onClick={openLinkDialog}
            >
              <Link2Icon />
            </ToolbarButton>
          </BubbleMenu>
        ) : null}
        <EditorContent
          editor={editor}
          className={cn(
            "min-h-[min(20rem,33.333dvh)] sm:min-h-[min(24rem,33.333dvh)]",
            editorContentWrapperClassName
          )}
        />
        {mode === "dashboard" ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 px-7 pt-2 pb-10 sm:px-10">
              <div className="text-xs text-muted-foreground">
                <CharacterLimitStatus
                  destinations={selectedDestinations}
                  limit={mostConstrainedCharacterLimit}
                />
              </div>
              {threadReplyFields.length === 0 ? dashboardActions : null}
            </div>
            {threadReplyFields.map((replyField, index) => (
              <Controller
                key={replyField.id}
                control={control}
                name={`threadReplies.${index}.contentHtml`}
                render={({ field }) => (
                  <ThreadReplyEditor
                    editorId={replyField.id}
                    index={index}
                    contentHtml={field.value}
                    errorMessage={
                      errors.threadReplies?.[index]?.contentHtml?.message
                    }
                    limit={threadReplyCharacterLimits[index] ?? null}
                    destinations={threadDestinations}
                    onChange={field.onChange}
                    onFocus={setActiveEditor}
                    onReady={registerReplyEditor}
                    onDestroy={unregisterReplyEditor}
                    onRemove={() => deleteThreadReply(index, replyField.id)}
                    footerActions={
                      index === threadReplyFields.length - 1
                        ? dashboardActions
                        : undefined
                    }
                  />
                )}
              />
            ))}
          </>
        ) : null}
        {mode === "landing" ? (
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-7 sm:px-8 sm:pt-8 sm:pb-7">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <CharacterLimitStatus
                destinations={selectedDestinations}
                limit={mostConstrainedCharacterLimit}
              />
            </div>
            <Popover defaultOpen={Boolean(effectiveLoginError)}>
              <PopoverTrigger render={<Button className="h-10 shadow-sm" />}>
                무료로 시작하기
              </PopoverTrigger>
              <PopoverContent align="end" side="top" sideOffset={10}>
                <PopoverHeader className="px-1 pt-1 pb-0.5">
                  <PopoverTitle>센드베이스 시작하기</PopoverTitle>
                  <PopoverDescription>
                    회원가입 없이 바로 시작
                  </PopoverDescription>
                </PopoverHeader>
                {effectiveLoginError ? (
                  <p
                    role="alert"
                    className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
                  >
                    {effectiveLoginError}
                  </p>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  {loginProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      render={<a href={`/api/auth/${provider.id}`} />}
                      nativeButton={false}
                      variant="secondary"
                      className="h-11 w-full justify-start gap-3 px-2.5 shadow-none"
                    >
                      <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                        <PlatformLogo
                          platform={provider.id}
                          className="size-4"
                        />
                      </span>
                      <span className="flex-1 text-left">{provider.label}</span>
                      <ArrowRightIcon className="text-muted-foreground" />
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </Card>
      <EditorLinkDialog
        open={linkDialog.open}
        hasSelectedText={linkDialog.hasSelectedText}
        canRemove={linkDialog.canRemove}
        initialValues={linkDialog.values}
        onOpenChange={(open) => {
          if (!open) closeLinkDialog(true)
        }}
        onSubmit={applyLink}
        onRemove={removeLink}
      />
    </div>
  )
}
