'use client';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage } from '../ui/avatar';
import { AvatarFallback } from '@radix-ui/react-avatar';
import { LabelValue } from '../LabelValue';
import { useSecureAvatar } from '@/hooks/useAvatarFromS3';

interface DetailsCardProps {
  title: string;
  subTitle?: string;
  avatarUrl: string | null;
  leftFields: { label: string; value: string | null }[];
  rightFields: { label: string; value: string | null }[];
}

const SecureAvatar = ({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className?: string;
}) => {
  const { imageUrl, isLoading } = useSecureAvatar(url);

  return (
    <Avatar className={className || 'h-32 w-32 border-4 border-white/20 shadow-lg'}>
      <AvatarImage src={imageUrl} alt={alt} className="object-cover" />
      <AvatarFallback className="bg-primary-foreground text-primary font-bold text-2xl">
        {isLoading ? <span className="animate-pulse">...</span> : alt.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

export const DetailsCard: React.FC<DetailsCardProps> = ({
  title,
  subTitle,
  avatarUrl,
  leftFields,
  rightFields,
}) => {
  // Filter out empty fields
  const filteredLeftFields = leftFields.filter(field => field.value && field.value.trim() !== '');
  const filteredRightFields = rightFields.filter(field => field.value && field.value.trim() !== '');

  const phoneField = filteredLeftFields.find(field => field.label === 'Phone');
  const emailField = filteredLeftFields.find(field => field.label === 'Email');
  const leftFieldsFiltered = filteredLeftFields.filter(
    field => field.label !== 'Phone' && field.label !== 'Email'
  );

  return (
    <Card className="overflow-hidden rounded-xl shadow-lg bg-gradient-to-r from-purple-600 to-purple-800">
      <div className="p-6 flex flex-col md:flex-row items-start gap-6">
        {/* Avatar and main info */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <SecureAvatar url={avatarUrl} alt={title} />

          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-3xl font-bold text-white">{title}</h2>
            {subTitle && <p className="text-purple-200 text-lg">{subTitle}</p>}

            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              {emailField && (
                <LabelValue
                  label={emailField.label}
                  value={emailField.value || ''}
                  className="text-purple-100"
                />
              )}

              {phoneField && (
                <LabelValue
                  label={phoneField.label}
                  value={phoneField.value || ''}
                  className="text-purple-100"
                />
              )}
            </div>
          </div>
        </div>

        {/* Additional fields */}
        {(leftFieldsFiltered.length > 0 || filteredRightFields.length > 0) && (
          <div className="mt-4 md:mt-0 md:ml-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
            {leftFieldsFiltered.length > 0 && (
              <div className="space-y-2">
                {leftFieldsFiltered.map((field, index) => (
                  <LabelValue
                    key={index}
                    label={field.label}
                    value={field.value || ''}
                    className="text-purple-100"
                  />
                ))}
              </div>
            )}

            {filteredRightFields.length > 0 && (
              <div className="space-y-2">
                {filteredRightFields.map((field, index) => (
                  <LabelValue
                    key={index}
                    label={field.label}
                    value={field.value || ''}
                    className="text-purple-100"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
