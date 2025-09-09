'use client';

import { Card } from '@/components/ui/card';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FullPageChat from '@/components/chat/FullPageChat'; // Import the existing FullPageChat component
import ChatModal from '@/components/chat/ChatModal'; // Import ChatModal for the modal option

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
    <div className={`h-full w-full flex flex-col gap-4 ${className}`}>
      {/* Header Card with Modal Option */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Client Messages Chat</h2>
              <p className="text-sm text-muted-foreground">
                Integrated chat for team communication
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Modal Option Button */}
            <ChatModal
              trigger={
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Modal
                </Button>
              }
              title="Client Messages Chat"
              onModalOpen={handleChatOpen}
              onModalClose={handleChatClose}
              defaultFullscreen={false}
            />
          </div>
        </div>
      </Card>

      {/* Full Page Chat Component */}
      <Card className="flex-1 p-0 overflow-hidden">
        <FullPageChat className="h-full" />
      </Card>
    </div>
  );
}
