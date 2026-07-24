import { TaskStatusEnum } from '@prisma/client';
import { Square } from 'lucide-react';
import Link from 'next/link';
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
  squareColor?: string;
  status?: TaskStatusEnum;
}
export const CountLabel: React.FC<CountLabelProps> = ({
  count,
  label,
  isList = false,
  lineHeight = 'normal',
  listOpacity,
  countSize = '2xl',
  align = 'end',
  labelSize = '2xl',
  countColor = 'primary',
  squareColor = 'primary',
  status,
}) => {
  return (
    <>
      {isList ? (
        <div className="flex justify-start gap-6">
          <Square
            className={`text-primary fill-primary opacity-${listOpacity} relative top-[0.6rem]`}
            width={10}
            height={10}
            style={{ color: squareColor, fill: squareColor }}
          />
          <div className={`flex flex-col items-${align}`}>
            {status ? (
              <Link
                href={`/taskOfferings?status=${status}`}
                className={`text-${labelSize} font-semibold hover:underline cursor-pointer hover:text-primary transition-colors duration-100`}
              >
                {label}
              </Link>
            ) : (
              <h2 className={`text-${labelSize} font-semibold`}>{label}</h2>
            )}
            <div className={`${countSize} font-extrabold text-${countColor} leading-${lineHeight}`}>
              {count > 9 || count == 0 ? count : `0${count}`}
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-${align}`}>
          {status ? (
            <Link
              href={`/taskOfferings?status=${status}`}
              className={`text-${labelSize} font-semibold hover:underline cursor-pointer hover:text-primary transition-colors duration-100`}
            >
              {label}
            </Link>
          ) : (
            <h2 className={`text-${labelSize} font-semibold`}>{label}</h2>
          )}
          <div className={`${countSize} text-${countColor} font-extrabold leading-${lineHeight}`}>
            {count > 9 || count === 0 ? count : `0${count}`}
          </div>
        </div>
      )}
    </>
  );
};
