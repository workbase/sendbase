import { afterEach, describe, expect, it, vi } from "vitest"

import { queryTikTokCreatorInfoWithToken, TikTokApiError } from "./client"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("TikTok API response logging", () => {
  it("logs a successful response without its raw payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            creator_nickname: "sensitive-nickname",
            privacy_level_options: ["SELF_ONLY"],
            comment_disabled: false,
          },
          error: { code: "ok", log_id: "tiktok-log-success" },
        }),
        { status: 200, statusText: "OK" }
      )
    )
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined)

    await queryTikTokCreatorInfoWithToken("secret-access-token")

    expect(log).toHaveBeenCalledWith("[publish][api-response]", {
      platform: "tiktok",
      operation: "query-creator-info",
      destinationId: null,
      status: 200,
      statusText: "OK",
      ok: true,
      response: { code: "ok", logId: "tiktok-log-success" },
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-access-token")
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive-nickname")
  })

  it("logs a safe error code and TikTok log ID before throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "invalid_param",
            message: "provider detail must not be logged",
            log_id: "tiktok-log-failure",
          },
        }),
        { status: 400, statusText: "Bad Request" }
      )
    )
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined)

    await expect(
      queryTikTokCreatorInfoWithToken("secret-access-token")
    ).rejects.toBeInstanceOf(TikTokApiError)

    expect(log).toHaveBeenCalledWith("[publish][api-response]", {
      platform: "tiktok",
      operation: "query-creator-info",
      destinationId: null,
      status: 400,
      statusText: "Bad Request",
      ok: false,
      response: { code: "invalid_param", logId: "tiktok-log-failure" },
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain("provider detail")
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-access-token")
  })
})
