// app/(dashboard)/messages/page.tsx
import FullPageChat from '@/components/chat/FullPageChat';

export default function MessagesPage() {
  return (
    <div className="h-[calc(100vh-2rem)] w-full">
      <FullPageChat />
    </div>
  );
}

export const metadata = {
  title: 'Messages | WNP',
  description: 'Team communication and messaging platform',
};
