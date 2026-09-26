"use client";

import { SignIn as SignInComponent } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SignIn() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <SignInComponent
        routing="hash"
        signUpUrl="/auth/signup"
        forceRedirectUrl={callbackUrl}
      />
    </div>
  );
}
