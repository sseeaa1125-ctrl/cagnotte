import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gray-200",
        className
      )}
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-3/4", className)} />;
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-12 w-12 rounded-full", className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-20 w-full rounded-2xl", className)} />;
}

export function SkeletonButton({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-12 w-full rounded-xl", className)} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="space-y-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function BlocksPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <SkeletonCard className="h-20" />
      <SkeletonButton />
      <div className="space-y-2">
        <SkeletonCard className="h-16" />
        <SkeletonCard className="h-16" />
        <SkeletonCard className="h-16" />
      </div>
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function BookingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-[72px] rounded-2xl" />
        <Skeleton className="h-[72px] rounded-2xl" />
        <Skeleton className="h-[72px] rounded-2xl" />
        <Skeleton className="h-[72px] rounded-2xl" />
      </div>
      {/* View toggle */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>
      {/* Calendar skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="mx-auto h-4 w-8" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-10 w-10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlockEditSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-7 w-48" />
      </div>
      <SkeletonCard className="h-64" />
      <SkeletonCard className="h-40" />
      <SkeletonButton />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <SkeletonCard className="h-64" />
    </div>
  );
}

export function DashboardShellSkeleton() {
  return (
    <div className="flex flex-col h-dvh lg:block lg:h-auto lg:min-h-dvh bg-gray-50">
      {/* TopBar mobile */}
      <header className="shrink-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </header>

      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-60 border-r border-gray-200 bg-white p-4 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-2 flex-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-5 w-5 rounded-lg" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overscroll-contain lg:overflow-visible lg:flex-none lg:pt-0 lg:pb-0 lg:pl-60">
        <div className="p-4 lg:p-6">
          <DashboardSkeleton />
        </div>
      </main>

      {/* BottomTabBar mobile */}
      <nav className="shrink-0 z-40 border-t border-gray-200 bg-white lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-center justify-around px-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="min-h-dvh flex font-sans bg-white w-full">
      {/* Left Side Skeleton (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col justify-between bg-zinc-950 p-12 relative overflow-hidden">
        <Skeleton className="h-12 w-[140px] bg-white/10" />
        
        <div className="relative z-10 max-w-lg mb-12">
          <Skeleton className="h-10 w-3/4 bg-white/10 mb-4" />
          <Skeleton className="h-10 w-1/2 bg-white/10 mb-10" />
          <Skeleton className="h-6 w-full bg-white/10" />
          <Skeleton className="h-6 w-5/6 bg-white/10 mb-10 mt-2" />
          
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
             <div className="flex -space-x-2.5">
               <Skeleton className="w-11 h-11 rounded-full border-2 border-zinc-900 bg-white/10" />
               <Skeleton className="w-11 h-11 rounded-full border-2 border-zinc-900 bg-white/10" />
               <Skeleton className="w-11 h-11 rounded-full border-2 border-zinc-900 bg-white/10" />
             </div>
             <div className="space-y-2">
               <Skeleton className="h-4 w-40 bg-white/10" />
               <Skeleton className="h-4 w-32 bg-white/10" />
             </div>
          </div>
        </div>
      </div>

      {/* Right Side Skeleton */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 w-full lg:w-1/2">
        <Skeleton className="lg:hidden mb-12 h-12 w-[130px] rounded-xl" />
        
        <div className="w-full max-w-[420px] mx-auto space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-40 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <div className="space-y-4 pt-4">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-14 w-full rounded-full mt-2" />
          <Skeleton className="mx-auto h-4 w-48 mt-6 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function StoreSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-gray-50 to-white">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-3">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
        </div>
      </div>
    </div>
  );
}
