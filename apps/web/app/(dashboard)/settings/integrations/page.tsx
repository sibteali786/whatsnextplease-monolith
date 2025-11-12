'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, CheckCircle } from 'lucide-react';

export default function IntegrationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'generate' | 'register' | 'verify'>('generate');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [credentials, setCredentials] = useState<any>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [registrationData, setRegistrationData] = useState({
    tenantId: '',
    name: '',
    domain: window.location.hostname,
    adminEmail: '',
  });

  const { toast } = useToast();
  const token = getCookie(COOKIE_NAME);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: 'Copied!', description: `${field} copied to clipboard` });
  };

  const generateCredentials = async () => {
    if (!registrationData.tenantId || !registrationData.name || !registrationData.adminEmail) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CHAT_API_URL}/api/admin/tenants/generate-credentials`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: registrationData.tenantId,
            name: registrationData.name,
            adminEmail: registrationData.adminEmail,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setCredentials(data.credentials);
        setShowCredentialsModal(true);
        setCurrentStep('register');
        toast({
          title: 'Credentials Generated!',
          description: 'Save these credentials - they will only be shown once',
        });
      } else {
        throw new Error(data.error || 'Failed to generate credentials');
      }
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const registerTenant = async () => {
    if (!credentials) {
      toast({
        title: 'No Credentials',
        description: 'Generate credentials first',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/register-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId: credentials.tenantId,
          domain: registrationData.domain,
          adminEmail: registrationData.adminEmail,
          name: registrationData.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Tenant Registered!',
          description: 'Now proceed to verify',
        });
        setCurrentStep('verify');
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTenant = async () => {
    if (!credentials) {
      toast({
        title: 'No Credentials',
        description: 'Complete previous steps first',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_CHAT_API_URL}/api/tenants/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: credentials.tenantId,
          verificationCode: 'auto-verify',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Chat Integration Active!',
          description: 'Your team chat is now fully enabled',
        });
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const CredentialsModal = () => (
    <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-900 dark:text-white">
            🔐 Chat Integration Credentials
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Copy these values to AWS Secrets Manager. <strong>They will only be shown once.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credentials */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-4 border dark:border-slate-700">
            <CredentialField
              label="CHAT_SHARED_SECRET"
              value={credentials?.sharedSecret}
              field="sharedSecret"
            />
            <CredentialField
              label="CHAT_APP_REGISTRATION_TOKEN"
              value={credentials?.registrationToken}
              field="registrationToken"
            />
            <CredentialField label="TENANT_ID" value={credentials?.tenantId} field="tenantId" />
            <CredentialField
              label="Expires At"
              value={new Date(credentials?.expiresAt).toLocaleString()}
              field="expiry"
              copyable={false}
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-3">
            <p className="font-semibold text-blue-900 dark:text-blue-100">📋 Next Steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>Copy the above values (click copy icons)</li>
              <li>
                Go to <strong>AWS Secrets Manager</strong> console
              </li>
              <li>
                Find your backend secret (e.g.,{' '}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  wnp-backend-secrets
                </code>
                )
              </li>
              <li>Click &quot;Retrieve secret value&quot; → &quot;Edit&quot;</li>
              <li>Add/update these key-value pairs</li>
              <li>Save changes</li>
              <li>
                <strong>Redeploy your backend</strong> (ECS will restart with new values)
              </li>
              <li>Wait ~2 minutes for deployment</li>
              <li>
                Return here and click <strong>&quot;Step 2: Register Tenant&quot;</strong>
              </li>
            </ol>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded text-sm text-amber-800 dark:text-amber-200">
            <strong>⚠️ Important:</strong> Backend must be redeployed for new secrets to take
            effect.
          </div>
        </div>

        <Button onClick={() => setShowCredentialsModal(false)} className="w-full">
          I&apos;ve Saved These Values - Continue to Register
        </Button>
      </DialogContent>
    </Dialog>
  );

  const CredentialField = ({
    label,
    value,
    // field,
    copyable = true,
  }: {
    label: string;
    value: string;
    field: string;
    copyable?: boolean;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="font-semibold text-sm text-slate-700 dark:text-slate-300">{label}</Label>
        {copyable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(value, label)}
            className="h-7 px-2 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {copiedField === label ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            )}
          </Button>
        )}
      </div>
      <code className="block p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs break-all font-mono text-slate-900 dark:text-slate-100">
        {value}
      </code>
    </div>
  );

  const StepBadge = ({ num, active, label }: { num: number; active: boolean; label: string }) => (
    <div className={`flex items-center gap-2 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          active ? 'bg-blue-600 text-white' : 'bg-slate-200'
        }`}
      >
        {num}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </div>
  );

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {showCredentialsModal && <CredentialsModal />}

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2">Enable Team Chat</h2>
        <p className="text-slate-600 mb-6">
          Connect your workspace to the integrated chat platform in 3 steps
        </p>

        {/* Step Indicator */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-10" />
          <StepBadge num={1} active={currentStep === 'generate'} label="Generate" />
          <StepBadge num={2} active={currentStep === 'register'} label="Register" />
          <StepBadge num={3} active={currentStep === 'verify'} label="Verify" />
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label>Admin Email *</Label>
            <Input
              type="email"
              value={registrationData.adminEmail}
              onChange={e =>
                setRegistrationData(prev => ({
                  ...prev,
                  adminEmail: e.target.value,
                }))
              }
              placeholder="admin@yourcompany.com"
              disabled={currentStep !== 'generate'}
            />
          </div>

          <div>
            <Label>Tenant Name *</Label>
            <Input
              value={registrationData.name}
              onChange={e =>
                setRegistrationData(prev => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Your Company Name"
              disabled={currentStep !== 'generate'}
            />
          </div>

          <div>
            <Label>Tenant ID *</Label>
            <Input
              value={registrationData.tenantId}
              onChange={e =>
                setRegistrationData(prev => ({
                  ...prev,
                  tenantId: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
                }))
              }
              placeholder="yourcompany (lowercase, no spaces)"
              disabled={currentStep !== 'generate'}
            />
            <p className="text-xs text-slate-500 mt-1">
              Lowercase letters, numbers, hyphens, underscores only
            </p>
          </div>

          <div>
            <Label>Domain</Label>
            <Input
              value={registrationData.domain}
              onChange={e =>
                setRegistrationData(prev => ({
                  ...prev,
                  domain: e.target.value,
                }))
              }
              disabled={currentStep !== 'generate'}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {currentStep === 'generate' && (
            <Button onClick={generateCredentials} disabled={isLoading} className="w-full" size="lg">
              {isLoading ? 'Generating...' : '🔑 Step 1: Generate Credentials'}
            </Button>
          )}

          {currentStep === 'register' && (
            <>
              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-200">
                ✅ Credentials generated! Update AWS Secrets Manager, redeploy, then click below.
              </div>
              <Button onClick={registerTenant} disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Registering...' : '📝 Step 2: Register Tenant'}
              </Button>
            </>
          )}

          {currentStep === 'verify' && (
            <>
              <div className="bg-green-50 p-3 rounded text-sm text-green-800 border border-green-200">
                ✅ Tenant registered! Click below to complete verification.
              </div>
              <Button onClick={verifyTenant} disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Verifying...' : '✓ Step 3: Verify & Activate'}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
