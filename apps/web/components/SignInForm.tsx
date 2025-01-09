"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/utils/validationSchemas";
import { signinUser } from "@/actions/auth";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react"; // Import icons for toggle
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react"; // Import useState for toggle functionality
import { useLoggedInUserState } from "@/store/useUserStore";
import { trimWhitespace } from "@/utils/utils";

const SignInForm = () => {
  const router = useRouter();
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    mode: "onSubmit",
  });
  const { setUser } = useLoggedInUserState();
  const [showPassword, setShowPassword] = useState(false); // State to manage password visibility

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    try {
      // Trim whitespace for all fields
      const trimmedData = trimWhitespace(data);

      const formData = new FormData();
      formData.append("username", trimmedData.username);
      formData.append("password", trimmedData.password);

      const response = await signinUser(formData);
      if (response && response.success) {
        if (response.user) {
          setUser(response.user);
        }
        router.push("/home");
      }
      if (response && !response.success && response.message) {
        form.setError("root", { message: response.message });
      }
    } catch (error) {
      console.error("Failed to sign you in: ", error);
      form.setError("root", { message: "Failed to sign in" });
    }
  };

  const pathname = usePathname();
  // Determine if the current path is /signin or /signup
  const isSignUp = pathname.includes("signup");
  return (
    <div className="w-full max-w-[600px] mx-auto flex-grow border border-default-100 shadow-lg rounded-lg">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-content1 p-6 flex flex-col justify-between gap-4 min-h-[100%]"
        >
          <h1 className="text-3xl font-bold">{!isSignUp && "Sign In"}</h1>
          <div>
            {/* Username Field */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="username">Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Username"
                      autoComplete="username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field with Show/Hide Toggle */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"} // Toggle between text and password
                        placeholder="Password"
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className="mt-4"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              "LOG IN"
            )}
          </Button>

          {form.formState.errors.root && (
            <p className="text-red-500 text-center">
              {form.formState.errors.root.message}
            </p>
          )}

          {/* Additional Options */}
          <div className="flex justify-between items-center mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox id="remember-me" />
              <Label htmlFor="remember-me">Remember me</Label>
            </div>
            <Link href="/forgot-password" className="text-purple-600">
              Forgot password?
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SignInForm;
// TODO: Make post login to make sure email provided by user is a correct one ( email confirmation ), we can some kidn of service for this
