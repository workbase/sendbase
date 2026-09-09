import { realpathSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { expect, it } from "vitest"

import config from "./next.config"

it("includes libvips binaries without traversing pnpm directory symlinks", () => {
  const files = config.outputFileTracingIncludes?.["/*"] ?? []
  if (process.platform === "linux" || process.platform === "darwin") {
    expect(files.length).toBeGreaterThan(0)
  }
  for (const file of files) {
    const absolute = resolve(file)
    expect(file).not.toMatch(/[?*]/)
    expect(statSync(absolute).isFile()).toBe(true)
    expect(absolute).toBe(realpathSync(absolute))
    expect(file).toContain("libvips-cpp")
  }
})
