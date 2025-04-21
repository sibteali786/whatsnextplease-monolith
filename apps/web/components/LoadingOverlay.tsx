import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Please wait...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in-0 duration-300">
      <div className="bg-card p-6 rounded-lg shadow-xl text-center max-w-sm mx-4">
        <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" />
        <p className="text-lg font-medium text-card-foreground">{message}</p>
      </div>
    </div>
  );
}
