import * as React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const ChecklistIcon = ({ size = 24, className, ...props }: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M26.206,3H25V2a1,1,0,0,0-2,0V3H17V2a1,1,0,0,0-2,0V3H9V2A1,1,0,0,0,7,2V3H5.794A3.8,3.8,0,0,0,2,6.794V27.206A3.8,3.8,0,0,0,5.794,31H26.206A3.8,3.8,0,0,0,30,27.206V6.794A3.8,3.8,0,0,0,26.206,3ZM28,27.206A1.8,1.8,0,0,1,26.206,29H5.794A1.8,1.8,0,0,1,4,27.206V6.794A1.8,1.8,0,0,1,5.794,5H7V6A1,1,0,0,0,9,6V5h6V6a1,1,0,0,0,2,0V5h6V6a1,1,0,0,0,2,0V5h1.206A1.8,1.8,0,0,1,28,6.794Z"
        fill="currentColor"
      />
      <path
        d="M12.293,11.293,10,13.586,8.707,12.293a1,1,0,1,0-1.414,1.414l2,2a1,1,0,0,0,1.414,0l3-3a1,1,0,0,0-1.414-1.414Z"
        fill="currentColor"
      />
      <path d="M24,13H17a1,1,0,0,0,0,2h7a1,1,0,0,0,0-2Z" fill="currentColor" />
      <path
        d="M12.293,20.293,10,22.586,8.707,21.293a1,1,0,1,0-1.414,1.414l2,2a1,1,0,0,0,1.414,0l3-3a1,1,0,0,0-1.414-1.414Z"
        fill="currentColor"
      />
      <path d="M24,22H17a1,1,0,0,0,0,2h7a1,1,0,0,0,0-2Z" fill="currentColor" />
    </svg>
  );
};
