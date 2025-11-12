'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PhoneInput } from '../ui/phone-input';
import { AddClientInput, addClientSchema } from '@/utils/validationSchemas';
import { CircleCheckBig, CircleX, Loader2 } from 'lucide-react'; // Importing the loader icon
import { useState } from 'react';
import addClient from '@/db/repositories/clients/addClient';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import { getPasswordStrength } from '@/utils/utils';

const AddClientForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false); // State to handle form submission
  const [passwordStrength, setPasswordStrength] = useState(0);
  const router = useRouter();
  const form = useForm<AddClientInput>({
    resolver: zodResolver(addClientSchema),
    mode: 'onSubmit',
  });
  const handlePasswordChange = (value: string) => {
    setPasswordStrength(getPasswordStrength(value));
  };
  const { toast } = useToast();
  const onSubmit = async (data: AddClientInput) => {
    setIsSubmitting(true); // Start the loader
    try {
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('companyName', data.companyName);
      formData.append('contactName', data.contactName || '');
      formData.append('email', data.email || '');
      formData.append('website', data.website || '');
      formData.append('passwordHash', data.password || '');
      formData.append('phone', data.phone || '');
      formData.append('address1', data.address1 || '');
      formData.append('address2', data.address2 || '');
      formData.append('city', data.city || '');
      formData.append('state', data.state || '');
      formData.append('zipCode', data.zipCode || '');

      const response = await addClient(formData);
      if (response.success) {
        console.log('Client data submitted:', response);
        toast({
          title: 'Client Created',
          description: `The client ${data.contactName} was created`,
          variant: 'success',
          icon: <CircleCheckBig size={40} />,
        });
        form.reset();
        router.push('/clients');
      } else {
        toast({
          title: 'Client Creation Failed',
          description: `The client ${data.contactName} was not created! Please try again`,
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      }
    } catch (e) {
      console.error('Failed to create a client', e);
      form.setError('root', { message: 'Failed to create a new client' });
    } finally {
      setIsSubmitting(false); // Stop the loader
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-content1 flex flex-col gap-4 pb-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Password"
                  {...field}
                  onChange={e => {
                    field.onChange(e);
                    handlePasswordChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
              <div className="mt-2">
                <PasswordStrengthMeter strength={passwordStrength} />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Company Name" {...field} />
              </FormControl>
              <FormDescription className="text-left">Enter Company Name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="Contact Name" {...field} />
              </FormControl>
              <FormDescription className="text-left">Enter Contact Name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="Email Address" {...field} />
              </FormControl>
              <FormDescription className="text-left">Enter an email address</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="Website" {...field} />
              </FormControl>
              <FormDescription className="text-left">Enter a website</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* TODO: The phone number is not selected when clicked once*/}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel className="text-left">Phone Number</FormLabel>
              <FormControl className="w-full">
                <PhoneInput placeholder="Enter a phone number" {...field} />
              </FormControl>
              <FormDescription className="text-left">Enter a phone number</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address 1</FormLabel>
              <FormControl>
                <Input placeholder="Address 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address 2</FormLabel>
              <FormControl>
                <Input placeholder="Address 2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="City" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input placeholder="State" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zip Code</FormLabel>
              <FormControl>
                <Input placeholder="Zip Code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : 'Save'}
          </Button>
        </div>
        {form.formState.errors.root && (
          <p className="text-red-500 text-center">{form.formState.errors.root.message}</p>
        )}
      </form>
    </Form>
  );
};

export default AddClientForm;
