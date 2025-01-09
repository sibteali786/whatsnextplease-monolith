import { Square } from "lucide-react";

interface CountLabelProps {
  count: number;
  label: string;
  isList?: boolean;
  lineHeight?: number | string;
  listOpacity: number;
  countSize?: string;
  align?: string;
  labelSize?: string;
  countColor?: string;
}
export const CountLabel: React.FC<CountLabelProps> = ({
  count,
  label,
  isList = false,
  lineHeight = "normal",
  listOpacity,
  countSize = "2xl",
  align = "end",
  labelSize = "2xl",
  countColor = "primary",
}) => {
  return (
    <>
      {isList ? (
        <div className="flex justify-start gap-6">
          <Square
            className={`text-primary fill-primary opacity-${listOpacity} relative top-[0.6rem]`}
            width={10}
            height={10}
          />
          <div className={`flex flex-col items-${align}`}>
            <h2 className={`text-${labelSize} font-semibold `}>{label}</h2>
            <div
              className={`${countSize} font-extrabold text-${countColor} leading-${lineHeight}`}
            >
              {count > 9 || count == 0 ? count : `0${count}`}
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-${align}`}>
          <h2 className={`text-${labelSize} font-semibold `}>{label}</h2>
          <div
            className={`${countSize} text-${countColor} font-extrabold leading-${lineHeight}`}
          >
            {count > 9 || count === 0 ? count : `0${count}`}
          </div>
        </div>
      )}
    </>
  );
};
