"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react"

import {
  acknowledgeTikTokManualReviewAction,
  getTikTokCreatorInfoAction,
} from "@/app/actions/posts"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import {
  TIKTOK_PHOTO_TITLE_MAX_LENGTH,
  type TikTokCreatorInfo,
  type TikTokPhotoPublishDraft,
  type TikTokPrivacyLevel,
} from "@/lib/platforms/tiktok/schema"

const privacyLabels: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: "전체 공개",
  MUTUAL_FOLLOW_FRIENDS: "서로 팔로우한 친구",
  FOLLOWER_OF_CREATOR: "팔로워",
  SELF_ONLY: "나만 보기",
}

function OptionSwitch({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function ConsentCheckbox({
  id,
  checked,
  label,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="leading-5">
        {label}
      </Label>
    </div>
  )
}

export default function TikTokPublishOptions({
  value,
  imageCount,
  descriptionLength,
  errorMessage,
  onChange,
  onManualReviewChange,
}: {
  value: TikTokPhotoPublishDraft
  imageCount: number
  descriptionLength: number
  errorMessage?: string
  onChange: (value: TikTokPhotoPublishDraft) => void
  onManualReviewChange: (required: boolean) => void
}) {
  const [creatorInfo, setCreatorInfo] = useState<
    (TikTokCreatorInfo & { requiresManualReview: boolean }) | null
  >(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadCreatorInfo = useCallback(() => {
    startTransition(async () => {
      try {
        setLoadError(null)
        const info = await getTikTokCreatorInfoAction()
        setCreatorInfo(info)
        onManualReviewChange(info.requiresManualReview)
        if (info.commentDisabled && value.allowComment) {
          onChange({ ...value, allowComment: false })
        }
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "TikTok 계정 정보를 불러오지 못했습니다."
        )
      }
    })
  }, [onChange, onManualReviewChange, value])

  useEffect(() => {
    loadCreatorInfo()
    // Creator Info is intentionally fetched once when this conditional UI mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(patch: Partial<TikTokPhotoPublishDraft>) {
    onChange({ ...value, ...patch })
  }

  function acknowledgeManualReview() {
    startTransition(async () => {
      try {
        await acknowledgeTikTokManualReviewAction()
        setCreatorInfo((current) =>
          current ? { ...current, requiresManualReview: false } : current
        )
        onManualReviewChange(false)
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "TikTok 확인 상태를 저장하지 못했습니다."
        )
      }
    })
  }

  return (
    <section
      className="mt-4 rounded-xl border bg-card p-5"
      aria-labelledby="tiktok-options-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="tiktok-options-heading" className="font-semibold">
            TikTok 게시 설정
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {creatorInfo
              ? `${creatorInfo.creatorNickname} 계정에 사진 게시물로 발행합니다.`
              : "연결된 계정 정보를 확인하고 있습니다."}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="TikTok 계정 정보 새로고침"
          disabled={isPending}
          onClick={loadCreatorInfo}
        >
          {isPending ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <RefreshCwIcon />
          )}
        </Button>
      </div>

      {loadError ? (
        <p className="mt-3 text-sm text-destructive">{loadError}</p>
      ) : null}
      {creatorInfo?.requiresManualReview ? (
        <div className="mt-4 rounded-lg bg-amber-500/10 p-4 text-sm">
          <p>
            이전 요청 결과를 알 수 없습니다. TikTok 앱에서 중복 게시 여부를 먼저
            확인해 주세요.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={isPending}
            onClick={acknowledgeManualReview}
          >
            TikTok 계정 확인 완료
          </Button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="tiktok-title">TikTok 제목</Label>
            <span className="text-xs text-muted-foreground">
              {value.title.length}/{TIKTOK_PHOTO_TITLE_MAX_LENGTH}
            </span>
          </div>
          <Input
            id="tiktok-title"
            value={value.title}
            maxLength={TIKTOK_PHOTO_TITLE_MAX_LENGTH}
            onChange={(event) => update({ title: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tiktok-privacy">공개 범위</Label>
          <NativeSelect
            id="tiktok-privacy"
            className="w-full"
            value={value.privacyLevel ?? ""}
            disabled={!creatorInfo}
            onChange={(event) =>
              update({
                privacyLevel: event.target.value
                  ? (event.target.value as TikTokPrivacyLevel)
                  : null,
              })
            }
          >
            <NativeSelectOption value="">선택해 주세요</NativeSelectOption>
            {creatorInfo?.privacyLevelOptions.map((privacy) => (
              <NativeSelectOption
                key={privacy}
                value={privacy}
                disabled={privacy === "SELF_ONLY" && value.brandContent}
              >
                {privacyLabels[privacy]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tiktok-cover">커버 이미지</Label>
          <NativeSelect
            id="tiktok-cover"
            className="w-full"
            value={Math.min(value.photoCoverIndex, Math.max(imageCount - 1, 0))}
            disabled={imageCount === 0}
            onChange={(event) =>
              update({ photoCoverIndex: Number(event.target.value) })
            }
          >
            {Array.from({ length: imageCount }, (_, index) => (
              <NativeSelectOption key={index} value={index}>
                이미지 {index + 1}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
        <OptionSwitch
          id="tiktok-comment"
          label="댓글 허용"
          checked={value.allowComment}
          disabled={creatorInfo?.commentDisabled ?? false}
          onCheckedChange={(checked) => update({ allowComment: checked })}
        />
        <OptionSwitch
          id="tiktok-music"
          label="추천 음악 자동 추가"
          checked={value.autoAddMusic}
          onCheckedChange={(checked) => update({ autoAddMusic: checked })}
        />
        <OptionSwitch
          id="tiktok-commercial"
          label="상업 콘텐츠"
          checked={value.commercialContent}
          onCheckedChange={(checked) =>
            update(
              checked
                ? { commercialContent: true }
                : {
                    commercialContent: false,
                    brandContent: false,
                    brandOrganic: false,
                    brandedContentPolicyAccepted: false,
                  }
            )
          }
        />
        <OptionSwitch
          id="tiktok-aigc"
          label="AI 생성 이미지"
          checked={value.isAigc}
          onCheckedChange={(checked) => update({ isAigc: checked })}
        />
      </div>

      {value.commercialContent ? (
        <div className="mt-5 space-y-4 rounded-lg bg-muted p-4">
          <OptionSwitch
            id="tiktok-brand-organic"
            label="내 브랜드 홍보"
            checked={value.brandOrganic}
            onCheckedChange={(checked) => update({ brandOrganic: checked })}
          />
          <OptionSwitch
            id="tiktok-brand-content"
            label="제3자 브랜드 콘텐츠"
            checked={value.brandContent}
            onCheckedChange={(checked) =>
              update({
                brandContent: checked,
                ...(checked && value.privacyLevel === "SELF_ONLY"
                  ? { privacyLevel: null }
                  : {}),
              })
            }
          />
          {value.brandContent ? (
            <p className="text-xs text-muted-foreground">
              브랜드 콘텐츠는 TikTok 정책상 &apos;나만 보기&apos;로 게시할 수
              없습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 space-y-4 border-t pt-5">
        <ConsentCheckbox
          id="tiktok-music-consent"
          checked={value.musicUsageAccepted}
          label="TikTok Music Usage Confirmation에 동의합니다."
          onCheckedChange={(checked) => update({ musicUsageAccepted: checked })}
        />
        {value.brandContent ? (
          <ConsentCheckbox
            id="tiktok-brand-consent"
            checked={value.brandedContentPolicyAccepted}
            label="TikTok Branded Content Policy에 동의합니다."
            onCheckedChange={(checked) =>
              update({ brandedContentPolicyAccepted: checked })
            }
          />
        ) : null}
      </div>

      <div className="mt-5 space-y-1 text-xs text-muted-foreground">
        <p>
          본문 {descriptionLength}/4,000 UTF-16 단위 · 이미지 {imageCount}/35장
        </p>
        {imageCount === 0 ? (
          <p className="text-destructive">
            TikTok 게시에는 이미지가 1장 이상 필요합니다.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-destructive">{errorMessage}</p>
        ) : null}
      </div>
    </section>
  )
}
