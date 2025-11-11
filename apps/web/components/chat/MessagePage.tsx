'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare, ExternalLink, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FullPageChat from '@/components/chat/FullPageChat';
import ChatModal from '@/components/chat/ChatModal'; // Import ChatModal for the modal option

interface MessagesPageProps {
  className?: string;
}

export default function MessagesPage({ className = '' }: MessagesPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModalOpen = () => {
    console.log('Modal modal opened');
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    console.log('Modal modal closed');
    setIsModalOpen(false);
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
            {!isModalOpen ? (
              <ChatModal
                trigger={
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Modal
                  </Button>
                }
                title="Client Messages Chat"
                onModalOpen={handleModalOpen}
                onModalClose={handleModalClose}
                defaultFullscreen={false}
              />
            ) : (
              <Button variant="outline" size="sm" onClick={handleModalClose} disabled>
                <Minimize2 className="w-4 h-4 mr-2" />
                Modal Active
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Full Page Chat Component */}
      {!isModalOpen && (
        <Card className="flex-1 p-0 overflow-hidden">
          <FullPageChat className="h-full" />
        </Card>
      )}

      {/* Show placeholder when modal is open */}
      {isModalOpen && (
        <Card className="flex-1 p-0 overflow-hidden flex items-center justify-center bg-muted/20">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Chat is open in modal view</p>
          </div>
        </Card>
      )}
    </div>
  );
}
