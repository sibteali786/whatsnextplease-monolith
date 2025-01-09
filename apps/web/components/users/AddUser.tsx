"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneInput } from "../ui/phone-input";
import { AddUserInput, addUserSchema } from "@/utils/validationSchemas";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import addUser from "@/db/repositories/users/addUser";
import { getPasswordStrength } from "@/utils/utils";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import PasswordStrengthMeter from "../PasswordStrengthMeter";
import { useToast } from "@/hooks/use-toast";

const AddUserForm = () => {
  const { toast } = useToast();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const router = useRouter();
  const form = useForm<AddUserInput>({
    resolver: zodResolver(addUserSchema),
    mode: "onSubmit",
  });

  const onSubmit = async (data: AddUserInput) => {
    try {
      const formData = new FormData();
      formData.append("role", data.role || "");
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);
      formData.append("username", data.username);
      formData.append("email", data.email);
      formData.append("phone", data.phone || "");
      formData.append("address", data.address || "");
      formData.append("city", data.city || "");
      formData.append("state", data.state || "");
      formData.append("zipCode", data.zipCode || "");
      formData.append("password", data.password);

      const response = await addUser(formData);
      if (response.success) {
        toast({ description: response.message, variant: "success" });
        router.push("/users");
        form.reset();
      } else {
        toast({ description: response.message, variant: "destructive" });
      }
    } catch (e) {
      console.error("Failed to create a user", e);
      form.setError("root", { message: "Failed to create a new user" });
    } finally {
    }
  };

  const handlePasswordChange = (value: string) => {
    setPasswordStrength(getPasswordStrength(value));
  };

  const roles = [
    "Developer",
    "Manager",
    "Administrator",
    "Designer",
    "Software Engineer",
    "Product Manager",
    "Salesman",
  ]; // Hardcoded list of roles

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="bg-content1 flex flex-col gap-4 pb-6"
      >
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pick User Role</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription className="text-left">
                Select the user role
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="First Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="Email Address" {...field} />
              </FormControl>
              <FormDescription className="text-left">
                Enter the user’s email address
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <PhoneInput placeholder="Enter a phone number" {...field} />
              </FormControl>
              <FormDescription className="text-left">
                Enter a phone number
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Address" {...field} />
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
                  onChange={(e) => {
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

        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              "Save"
            )}
          </Button>
        </div>
        {form.formState.errors.root && (
          <p className="text-red-500 text-center">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Form>
  );
};

export default AddUserForm;
