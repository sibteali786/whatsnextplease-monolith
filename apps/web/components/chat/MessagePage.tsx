'use client';

import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatModal from './ChatModal'; // Adjust import path as needed

interface MessagesPageProps {
  className?: string;
}

export default function MessagesPage({ className = '' }: MessagesPageProps) {
  const handleChatOpen = () => {
    console.log('Chat modal opened');
    // Add any analytics or tracking here
  };

  const handleChatClose = () => {
    console.log('Chat modal closed');
    // Add any cleanup or analytics here
  };

  return (
    <Card className={`h-full w-full p-6 ${className}`}>
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <MessageSquare className="w-16 h-16 mx-auto text-primary" />
          <h2 className="text-2xl font-semibold">Client Messages Chat</h2>
          <p className="text-muted-foreground max-w-md">
            Connect with your team through our integrated chat application. Click below to start
            messaging.
          </p>
        </div>

        {/* Chat Modal Trigger */}
        <ChatModal
          triggerText="Open Chat"
          title="Client Messages Chat"
          onModalOpen={handleChatOpen}
          onModalClose={handleChatClose}
          defaultFullscreen={false}
        />

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Chat Service Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Real-time Messaging</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
