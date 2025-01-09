"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage } from "../ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { LabelValue } from "../LabelValue";

interface DetailsCardProps {
  title: string;
  subTitle?: string;
  avatarUrl?: string | null;
  leftFields: { label: string; value: string | null }[];
  rightFields: { label: string; value: string | null }[];
}

export const DetailsCard: React.FC<DetailsCardProps> = ({
  title,
  subTitle,
  avatarUrl,
  leftFields,
  rightFields,
}) => {
  return (
    <Card className="p-8 bg-[#7F56D9] text-white rounded-md shadow-md flex flex-row gap-8 items-center">
      <div className="flex items-center just gap-8">
        <Avatar className="h-[120px] w-[120px]">
          <AvatarImage src={avatarUrl ?? ""} alt={title} />
          <AvatarFallback>{title.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">{title}</h2>
          <LabelValue label={"Contact Name"} value={subTitle ?? ""} />
          {leftFields.find((field) => field.label === "Phone") && (
            <LabelValue
              label={"Phone"}
              value={
                leftFields.find((field) => field.label === "Phone")?.value || ""
              }
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="flex flex-col gap-2">
          {leftFields.map(
            (field, index) =>
              field.label !== "Phone" && (
                <LabelValue
                  key={index}
                  label={field.label}
                  value={field.value || ""}
                />
              ),
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-2">
          {rightFields.map((field, index) => (
            <LabelValue
              key={index}
              label={field.label}
              value={field.value || ""}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};
