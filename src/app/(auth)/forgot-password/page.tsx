"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Mail, ArrowRight } from "lucide-react";

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
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas";
import { forgotPasswordAction } from "@/features/auth/actions";

type SchemaType = Parameters<typeof zodResolver>[0];

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = React.useTransition();
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema as unknown as SchemaType),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: ForgotPasswordInput) {
    startTransition(async () => {
      const result = await forgotPasswordAction(values);

      if (!result.ok) {
        toast.error("Request failed", {
          description: result.message,
        });
        return;
      }

      setSubmitted(true);
      toast.success("Reset link sent!");
    });
  }

  if (submitted) {
    return (
      <Card className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/30 text-center p-6 space-y-4">
        <CardHeader className="space-y-3 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            If an account exists with that email address, we have sent instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center border-t border-border/50 pt-4">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to sign in</span>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/30 overflow-hidden">
      <CardHeader className="space-y-1.5 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider w-fit">
          Account Recovery
        </div>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
          Reset your password
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
          Enter your registered email and we&apos;ll send you a secure link to reset your credentials.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-semibold">Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="seller@example.com"
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

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all mt-2 gap-2"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex items-center justify-center border-t border-border/50 py-4 bg-muted/20 text-xs text-muted-foreground">
        Remember your password?{" "}
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
