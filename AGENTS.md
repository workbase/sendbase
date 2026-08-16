General
• Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Supabase
• / = unified login/signup entry.
• Provide fully working production-ready code only.
• Default to Server Components; Client Components only for real interaction (forms, dialogs, toggles, browser APIs).
• Avoid redundant fetches, unnecessary CSR, and hydration overhead.
• App data mutations should use Server Actions. Client-side Supabase is allowed only for official auth flows or browser-only session/storage needs when a Server Action is not practical.


Rendering & Architecture
• Server Components by default; fetch on server, pass data via props/context.
• Global data (auth, profile) should be fetched once at layout level and shared when child routes need it.
• Never refetch the same data in pages/actions if already provided by layout or request-level cache.
• SSR-first even when client interaction is required; wrap only the interactive parts.
• Heavy UI (tables, dashboards, lists) should render on server when possible; interaction layers stay minimal.
• Use Suspense + skeletons for expensive sections.
• Cache with fetch revalidation by default; use no-store only when strictly required.
• Use revalidateTag / revalidatePath selectively; avoid router.refresh() when possible.
• Read operations must never cause writes; background jobs/schedulers handle cleanup.


Client Components & Bundling
• Do not make layouts client components.
• Never convert a whole component to client “for one button”. Split instead.
• Modals, calendars, editors, and large forms should be lazy-loaded and mounted on demand when practical.
• Do not pre-mount forms/modals per table row; render only for selected items.
• Avoid heavy client utilities (date-fns/locale, etc.); format on server or via Intl unless isolated inside a UI primitive.
• Prefer Next.js Link over useRouter for navigation.


Styling
• Tailwind utilities only.
• Avoid inline styles, arbitrary px values, and raw hex colors in product UI. Exceptions are limited to SVG brand assets, chart primitive internals, and library-required CSS variable plumbing.
• Extend via cva variants or wrappers, not page-level overrides.
• Lucide icons are the default icon set.
• No extra CSS beyond global tokens, resets, and narrowly scoped app-wide utilities.


Supabase
• Never expose service_role to the client.
• Server: createServerClient; Client: session-based supabase-js only when needed.
• Multi-table writes should use RPC or transactions.
• Always normalize and handle errors explicitly.
• Auth flows must use official Supabase APIs only.


Supabase Type Generation
• After schema changes, tell user to regenerate types.


Database Migrations
• All schema changes via migrations only.
• Use: supabase migration new
• Never edit previous migration files.
• Do not hand-write SQL outside migrations.
• Instruct user to apply changes with: supabase db push


Forms & Mutations
• Prefer react-hook-form + zod for interactive forms.
• Validate on both client and server using the same schema when the form submits to a Server Action.
• Server Actions must re-validate inputs.
• Input changes must not trigger server calls on every keystroke.
• Use explicit submit or debounce-based autosave.
• Errors must be clear, user-actionable, and consistent.


Code Quality
• Fully typed code; no any.
• Business logic lives in app/lib, not components.
• No console.log in final code.
• Use async/await consistently.
• Keep components small; split when logic or responsibility grows.
• Comments only for non-obvious logic.


shadcn/ui
• /components/ui is the single authority for primitives.
• No ad-hoc styling of primitives inside pages.
• Extend via variants or shared wrappers only.
• Reusable UI patterns belong in ui or shared, not page files.


Data Fetching Rules
• Fetch as close to route/layout as possible.
• Never fetch the same data multiple times per request.
• Prefer parent fetch + prop passing for list/detail pages.
• Select only required columns; avoid select(”*”).
• Set revalidation intervals based on data volatility.


AI Response Rules
• When modifying code, output by file.
• Separate explanation from code.
• Never violate stack or architectural rules above.
• Briefly justify any new dependency.
• Keep output minimal, consistent, and production-safe.

