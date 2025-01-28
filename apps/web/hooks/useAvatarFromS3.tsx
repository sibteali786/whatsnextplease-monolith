import { COOKIE_NAME } from '@/utils/constant';
import { useEffect, useState } from 'react';

export const useSecureAvatar = (
  url: string | null,
  fallbackUrl: string = 'https://github.com/shadcn.png'
) => {
  const [imageUrl, setImageUrl] = useState<string>(fallbackUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setImageUrl(fallbackUrl);
      setIsLoading(false);
      return;
    }

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };

    const fetchImage = async () => {
      try {
        setIsLoading(true);
        const token = getCookie(COOKIE_NAME);
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load image'));
        setImageUrl(fallbackUrl);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();

    // Cleanup function to revoke object URL
    return () => {
      if (imageUrl && imageUrl !== fallbackUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [url, fallbackUrl]);

  return { imageUrl, isLoading, error };
};
