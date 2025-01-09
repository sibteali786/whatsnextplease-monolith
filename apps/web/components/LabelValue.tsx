interface LabelValueProps {
  label: string;
  value: string;
  className?: string;
}

export const LabelValue: React.FC<LabelValueProps> = ({
  label,
  value,
  className,
}) => {
  return (
    <p className={`${className} font-bold text-base`}>
      {label ? label + ":" : ""} <span className="font-normal">{value}</span>
    </p>
  );
};
