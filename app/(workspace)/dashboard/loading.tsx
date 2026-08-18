import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-end gap-5 px-4 pt-20 sm:px-6">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="mt-12 h-96 rounded-t-xl" />
    </div>
  )
}
