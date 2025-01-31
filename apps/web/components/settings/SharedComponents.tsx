// components/settings/ProfileForm/SharedComponents.tsx
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import { UseFormReturn } from 'react-hook-form';
import { getPasswordStrength } from '@/utils/utils';

interface SectionHeaderProps {
  title: string;
  isEditing: boolean;
  onEditToggle: () => void;
}

export const SectionHeader = ({ title, onEditToggle }: SectionHeaderProps) => (
  <div className="flex items-center justify-between">
    <CardTitle>{title}</CardTitle>
    <Button type="button" variant="ghost" size="icon" onClick={onEditToggle}>
      <Pencil className="h-4 w-4" />
    </Button>
  </div>
);

interface PasswordSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  isEditing: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  passwordStrength: number;
  onStrengthChange: (strength: number) => void;
}

export const PasswordSection = ({
  form,
  isEditing,
  showPassword,
  setShowPassword,
  passwordStrength,
  onStrengthChange,
}: PasswordSectionProps) => (
  <Card>
    <CardHeader>
      <SectionHeader
        title="Password"
        isEditing={isEditing}
        onEditToggle={() => {}} // Pass the toggle function
      />
    </CardHeader>
    <CardContent className="grid gap-6">
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="password.newPassword"
          disabled={!isEditing}
          render={({ field }) => (
            <FormItem>
              <FormLabel>NEW PASSWORD</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    disabled={!isEditing}
                    onChange={e => {
                      field.onChange(e);
                      if (e.target.value) {
                        onStrengthChange(getPasswordStrength(e.target.value));
                      } else {
                        onStrengthChange(0);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
              {field.value && (
                <div className="mt-2">
                  <PasswordStrengthMeter strength={passwordStrength} />
                </div>
              )}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password.confirmPassword"
          disabled={!isEditing}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CONFIRM PASSWORD</FormLabel>
              <FormControl>
                <Input {...field} type="password" disabled={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </CardContent>
  </Card>
);

interface AddressSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  isEditing: boolean;
  onEditToggle: () => void;
}

export const AddressSection = ({ form, isEditing, onEditToggle }: AddressSectionProps) => (
  <Card>
    <CardHeader>
      <SectionHeader title="Address" isEditing={isEditing} onEditToggle={onEditToggle} />
    </CardHeader>
    <CardContent className="grid gap-6">
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="address.country"
          disabled={!isEditing}
          render={({ field }) => (
            <FormItem>
              <FormLabel>COUNTRY</FormLabel>
              <FormControl>
                <Input {...field} readOnly={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address.city"
          disabled={!isEditing}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CITY/STATE</FormLabel>
              <FormControl>
                <Input {...field} readOnly={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address.postalCode"
          disabled={!isEditing}
          render={({ field }) => (
            <FormItem>
              <FormLabel>POSTAL CODE</FormLabel>
              <FormControl>
                <Input {...field} readOnly={!isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </CardContent>
  </Card>
);
