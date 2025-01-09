import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-[400px] w-full">
      <Skeleton className="w-full h-full rounded-2xl" />
    </div>
  );
}
