const PasswordStrengthMeter = ({ strength }: { strength: number }) => {
  const strengthText = ["Too Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  return (
    <div className="mt-1">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 w-full ${
              i < strength ? strengthColor[strength - 1] : "bg-gray-300"
            }`}
          />
        ))}
      </div>
      <p className="text-xs mt-1 text-gray-600">
        {strengthText[strength - 1] || "Too Weak"}
      </p>
    </div>
  );
};
export default PasswordStrengthMeter;
