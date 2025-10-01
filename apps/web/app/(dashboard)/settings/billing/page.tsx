import { Cog } from 'lucide-react';

export default function Billing() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billings</h1>

      <div className="flex flex-col items-center justify-center w-full gap-2">
        <Cog className="text-primary rotateAnimation" size={60} />
        <h1 className="text-4xl font-semibold text-primary">Coming Soon...</h1>
        <p className="text-lg font-semibold">Our Team is Hard at Work – See You Soon!</p>
      </div>
    </div>
  );
}
