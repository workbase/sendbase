import { expect, it, vi } from "vitest"

const { loadSharp } = vi.hoisted(() => ({
  loadSharp: vi.fn(() => {
    throw new Error("Native image runtime unavailable")
  }),
}))

vi.mock("sharp", loadSharp)

it("loads post actions without initializing the native image runtime", async () => {
  const actions = await import("@/app/actions/posts")
  expect(actions).toBeDefined()
  expect(loadSharp).not.toHaveBeenCalled()

  const { preparePostHtmlForSoop, optimizePostImage } = await import("./images")
  const html = "<p>Text-only post</p>"
  await expect(preparePostHtmlForSoop("user-1", html)).resolves.toBe(html)
  expect(loadSharp).not.toHaveBeenCalled()

  await expect(optimizePostImage(Buffer.from("image"))).rejects.toThrow()
  expect(loadSharp).toHaveBeenCalledOnce()
})
