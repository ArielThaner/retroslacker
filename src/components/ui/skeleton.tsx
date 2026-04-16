export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function InsightSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
