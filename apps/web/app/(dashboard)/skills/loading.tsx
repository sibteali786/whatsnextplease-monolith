import { Skeleton } from "@/components/ui/skeleton";

const LoadingSkills = async () => {
  return (
    <div className="space-y-6">
      {/* Categories and Skill Cards */}
      <div className="space-y-6">
        {[1, 2, 3].map((_, categoryIndex) => (
          <div key={categoryIndex} className="space-y-4">
            {/* Category Title */}
            <Skeleton className="h-5 w-[200px]" />

            {/* Skill Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(5)].map((_, skillIndex) => (
                <div
                  key={skillIndex}
                  className="p-4 border rounded-lg shadow-sm flex flex-col items-center"
                >
                  {/* Icon */}
                  <Skeleton className="h-10 w-10 mb-2" />

                  {/* Skill Title */}
                  <Skeleton className="h-4 w-3/4 mb-1" />

                  {/* Skill Description */}
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSkills;
