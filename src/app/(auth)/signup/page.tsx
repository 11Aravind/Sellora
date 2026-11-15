"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signupSchema, type SignupInput } from "@/features/auth/schemas";
import { signupAction } from "@/features/auth/actions";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";

type SchemaType = Parameters<typeof zodResolver>[0];

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [confirmationSent, setConfirmationSent] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema as unknown as SchemaType),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const result = await signupAction(values);

      if (!result.ok) {
        toast.error("Sign up failed", {
          description: result.message,
        });
        return;
      }

      if (result.data.requiresEmailConfirmation) {
        setConfirmationSent(true);
        toast.success("Confirmation email sent!", {
          description: "Please check your inbox to confirm your account.",
        });
      } else {
        toast.success("Account created successfully!");
        router.push("/onboarding");
        router.refresh();
      }
    });
  }

  if (confirmationSent) {
    return (
      <Card className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/30 text-center p-6 space-y-4">
        <CardHeader className="space-y-3 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-xs">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            We have sent a verification link to your email address. Click the link to complete your registration and launch your store.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center border-t border-border/50 pt-4">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/30 overflow-hidden">
      <CardHeader className="space-y-1.5 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider w-fit">
          14-Day Free Trial
        </div>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
          Create your account
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
          Set up your store in minutes. No credit card required upfront.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <GoogleSignInButton
          label="Sign up with Google"
          nextPath="/onboarding"
          className="w-full h-11 font-semibold text-xs border-border/80 hover:bg-muted/60 shadow-2xs gap-2.5 rounded-xl transition-all"
        />

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-card px-3 text-muted-foreground font-semibold tracking-wider">
              Or continue with email
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-semibold">Full name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Jane Doe"
                        autoComplete="name"
                        disabled={isPending}
                        className="pl-10 h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/20 text-xs font-medium"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-semibold">Work email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="jane@example.com"
                        autoComplete="email"
                        disabled={isPending}
                        className="pl-10 h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/20 text-xs font-medium"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-semibold">
                    Password <span className="font-normal text-muted-foreground">(min 8 characters)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={isPending}
                        className="pl-10 pr-10 h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/20 text-xs font-medium"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all mt-2 gap-2"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start Free Trial</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex items-center justify-center border-t border-border/50 py-4 bg-muted/20 text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="ml-1.5 font-bold text-primary hover:underline inline-flex items-center gap-0.5"
        >
          <span>Sign in</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}
