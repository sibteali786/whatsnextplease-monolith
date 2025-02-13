import { NotificationSettingsForm } from '@/components/notifications/NotificationSettingsForm';

export default function Notifications() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <NotificationSettingsForm />
    </div>
  );
}
