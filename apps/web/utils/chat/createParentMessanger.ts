import { ParentAppMessenger } from '@/components/chat/ParentAppMessenger';

export function createParentAppMessenger(appId: string, appName: string, chatAppOrigin?: string) {
  return new ParentAppMessenger({
    appId,
    appName,
    chatAppOrigin: chatAppOrigin || 'https://chat-app-frontend-one-coral.vercel.app',
  });
}
