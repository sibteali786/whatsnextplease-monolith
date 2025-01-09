import { Skeleton } from "@/components/ui/skeleton";

const LoadingTasks = () => {
  return (
    <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
      <Skeleton className="w-24 h-[20px] col-span-full" />
      {Array(3)
        .fill(0)
        .map((index) => (
          <Skeleton
            key={index}
            className="max-w-md w-full rounded-2xl h-[400px]"
          />
        ))}
    </div>
  );
};

export default LoadingTasks;
