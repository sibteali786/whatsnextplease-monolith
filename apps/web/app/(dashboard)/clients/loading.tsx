"use client";

import { Skeleton } from "@/components/ui/skeleton";

const LoadingSkeleton = () => {
  const rows = Array.from({ length: 5 }); // Create 10 skeleton rows

  return (
    <div className="container mx-auto py-10">
      <div className="">
        <div className="flex justify-between items-center px-4 py-2 border-">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-8 w-32" />
        </div>
        <table className="w-full border rounded-md">
          <thead className="">
            <tr>
              <th className="p-4 text-left">
                <Skeleton className="h-5 w-24" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-5 w-24" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-5 w-24" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-5 w-24" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-5 w-24" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-5 w-24" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((_, index) => (
              <tr key={index} className="border-t">
                <td className="p-4">
                  <Skeleton className="h-5 w-full" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-5 w-full" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-5 w-full" />
                </td>
                <td className="p-4 hidden md:table-cell">
                  <Skeleton className="h-5 w-full" />
                </td>
                <td className="p-4 hidden md:table-cell">
                  <Skeleton className="h-5 w-full" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
