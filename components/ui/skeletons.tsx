import { cn } from '@/lib/utils';

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl p-5 bg-card border border-border", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="h-3 w-20 bg-muted rounded mb-4" />
          <div className="h-7 w-16 bg-muted rounded mb-2" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
        <div className="w-9 h-9 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between border-b border-border py-3 px-4 bg-muted/20">
        {Array(columns).fill(0).map((_, i) => (
          <div key={i} className="h-3 bg-muted rounded w-16" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4 px-4">
            {Array(columns).fill(0).map((_, j) => (
              <div key={j} className={cn("h-4 bg-muted rounded", j === 0 ? "w-32" : "w-16")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array(items).fill(0).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 w-48 bg-muted rounded mb-2.5" />
            <div className="h-2.5 w-24 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[400px] bg-card border border-border rounded-xl p-4">
          <TableSkeleton />
        </div>
        <div className="h-[400px] bg-card border border-border rounded-xl p-4">
          <ListSkeleton />
        </div>
      </div>
    </div>
  );
}
