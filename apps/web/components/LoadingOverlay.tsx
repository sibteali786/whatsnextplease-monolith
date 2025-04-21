import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Please wait...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl text-center max-w-sm">
        <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" />
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
