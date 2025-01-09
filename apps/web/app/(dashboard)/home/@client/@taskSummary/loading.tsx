import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="col-span-2">
      <Skeleton className="w-full h-full rounded-2xl" />
    </div>
  );
}
