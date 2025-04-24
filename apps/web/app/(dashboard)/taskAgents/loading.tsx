import { Skeleton } from '@/components/ui/skeleton';

const TaskAgentsLoadingSkeleton = () => {
  const rows = Array.from({ length: 5 }); // Create 5 skeleton rows

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-1/3" />
        </div>

        <Skeleton className="h-10 w-1/4 mt-4" />

        <div className="rounded-md border">
          <div className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-4">
                    <Skeleton className="h-5 w-5" />
                  </th>
                  <th className="p-4 text-left">
                    <Skeleton className="h-5 w-24" />
                  </th>
                  <th className="p-4 text-left">
                    <Skeleton className="h-5 w-24" />
                  </th>
                  <th className="p-4 text-center">
                    <Skeleton className="h-5 w-full" />
                  </th>
                  <th className="p-4 text-center">
                    <Skeleton className="h-5 w-full" />
                  </th>
                  <th className="p-4 text-center">
                    <Skeleton className="h-5 w-full" />
                  </th>
                  <th className="p-4 text-center">
                    <Skeleton className="h-5 w-full" />
                  </th>
                  <th className="p-4 text-right">
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((_, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4">
                      <Skeleton className="h-5 w-5" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="p-4 text-center">
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </td>
                    <td className="p-4 text-right">
                      <Skeleton className="h-5 w-24 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
    </div>
  );
};

export default TaskAgentsLoadingSkeleton;
