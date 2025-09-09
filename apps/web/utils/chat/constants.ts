import z from 'zod';

export const ChatMessageType = z.enum([
  'CHAT_READY',
  'NEW_MESSAGE',
  'MESSAGE_COUNT_UPDATE',
  'MESSAGE_READ',
  'CHAT_DISCONNECTED',
]);

export const ParentChatInfoTypes = z.enum([
  'PARENT_APP_INFO',
  'MARK_AS_READ',
  'USER_INFO_UPDATE',
  'THEME_UPDATE',
]);

export const CHAT_APP = 'chat-app';
export const PARENT_APP = 'parent-app';
export const WNP_APP = 'wnp-app';
