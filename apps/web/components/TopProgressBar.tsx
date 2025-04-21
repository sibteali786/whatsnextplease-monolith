'use client';

import { useEffect, useState } from 'react';

interface TopProgressBarProps {
  isLoading: boolean;
}

export function TopProgressBar({ isLoading }: TopProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      // Reset progress when loading starts
      setProgress(0);

      // Quickly move to 30%
      const timer1 = setTimeout(() => setProgress(30), 100);

      // Move to 60% after a short delay
      const timer2 = setTimeout(() => setProgress(60), 400);

      // Move to 80% - simulating almost done
      const timer3 = setTimeout(() => setProgress(80), 800);

      // Cleanup timers
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else if (progress > 0) {
      // When loading completes, finish the progress animation
      setProgress(100);

      // Reset after animation completes
      const timer = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, progress]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-1 bg-primary z-50 transition-all duration-300 ${progress === 0 ? 'opacity-0' : 'opacity-100'}`}
      style={{ width: `${progress}%` }}
    />
  );
}
