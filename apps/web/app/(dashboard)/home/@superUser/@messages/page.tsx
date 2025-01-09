import { Card } from "@/components/ui/card";
import { delay } from "@/utils/delay";

export default async function MessagesSection() {
  await delay(2000);
  return (
    <Card className="h-full w-full p-4 flex flex-col items-center justify-center">
      <h2 className="text-xl font-semibold">Client Messages</h2>
      <p className="text-4xl text-primary font-bold ">Coming Soon</p>
    </Card>
  );
}
