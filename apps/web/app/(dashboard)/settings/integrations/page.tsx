'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

export default function IntegrationsPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    tenantId: '',
    name: '',
    domain: window.location.hostname,
    adminEmail: '',
  });
  const { toast } = useToast();
  const token = getCookie(COOKIE_NAME);

  const registerTenant = async () => {
    setIsRegistering(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/register-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Chat Integration Enabled',
          description: 'Your chat workspace is now active!',
        });
      }
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'Please contact support' + error,
        variant: 'destructive',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Enable Team Chat</h2>
      <p className="text-muted-foreground mb-6">
        Connect your workspace to our integrated chat platform
      </p>

      <div className="space-y-4">
        <Label>Admin Email</Label>
        <Input
          value={registrationData.adminEmail}
          onChange={e =>
            setRegistrationData(prev => ({
              ...prev,
              adminEmail: e.target.value,
            }))
          }
          placeholder="admin@yourcompany.com"
        />
        <Label>Tenant Name</Label>
        <Input
          value={registrationData.name}
          onChange={e =>
            setRegistrationData(prev => ({
              ...prev,
              name: e.target.value,
            }))
          }
          placeholder="ABC Company"
        />
        <Label>Tenant Id</Label>
        <Input
          value={registrationData.tenantId}
          onChange={e =>
            setRegistrationData(prev => ({
              ...prev,
              tenantId: e.target.value,
            }))
          }
          placeholder="abcompany"
        />

        <Button onClick={registerTenant} disabled={isRegistering || !registrationData.adminEmail}>
          {isRegistering ? 'Registering...' : 'Enable Chat Integration'}
        </Button>
      </div>
    </Card>
  );
}
