'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { usePushNotification } from '@/hooks/usePushNotification';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

const FormSchema = z.object({
  desktop_notifications: z.boolean().default(false).optional(),
});

export function NotificationSettingsForm() {
  const { toast } = useToast();
  const { isPushSupported, subscription, subscribeToNotifications, unsubscribeFromNotifications } =
    usePushNotification();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      desktop_notifications: !!subscription, // Convert subscription to boolean
    },
  });
  // Update form value when subscription changes
  useEffect(() => {
    form.setValue('desktop_notifications', !!subscription);
  }, [subscription, form]);
  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    const { desktop_notifications } = data;
    try {
      if (desktop_notifications) {
        await subscribeToNotifications();
        toast({
          title: 'Desktop notifications enabled',
          icon: <CheckCircle className="text-green-500" />,
          variant: 'success',
        });
      } else {
        await unsubscribeFromNotifications();
        toast({
          title: 'Desktop notifications disabled',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to update notifications:', error);
      // Revert form state on error
      form.setValue('desktop_notifications', !!subscription);
      toast({
        title: 'Failed to update notifications',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <div>
          <h3 className="mb-4 text-lg font-medium">Notifications</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="desktop_notifications"
              disabled={!isPushSupported}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Desktop Notifications</FormLabel>
                    <FormDescription>
                      Receive notification all of the messages, contracts, documents.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
