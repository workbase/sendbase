import { readFileSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, relative, resolve } from "node:path"
import type { NextConfig } from "next"

const requireFromProject = createRequire(resolve("package.json"))
const sharpEntry = requireFromProject.resolve("sharp")
const requireFromSharp = createRequire(sharpEntry)
const sharpPackage = JSON.parse(
  readFileSync(resolve(dirname(sharpEntry), "../package.json"), "utf8")
) as { optionalDependencies: Record<string, string> }

// Include only real binary files: pnpm alias paths can conflict with traced symlinks.
const sharpLibraries = Object.keys(sharpPackage.optionalDependencies)
  .filter((name) => name.startsWith("@img/sharp-libvips-"))
  .flatMap((name) => {
    try {
      const binary = realpathSync(requireFromSharp.resolve(`${name}/binary`))
      return [`./${relative(process.cwd(), binary).replaceAll("\\", "/")}`]
    } catch (error) {
      // Optional packages for other operating systems are not installed.
      if ((error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") return []
      throw error
    }
  })

const nextConfig: NextConfig = {
  // Next.js 16's tracer only special-cases sharp/lib/index.js, before sharp 0.35.
  outputFileTracingIncludes: {
    "/*": sharpLibraries,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
}

export default nextConfig
