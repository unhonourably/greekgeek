import { Wordmark } from "@/components/brand";
import { Notice } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";

export const instant = false;

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center bg-canvas px-6 py-12">
      <Wordmark />
      <div className="mt-10 w-full max-w-sm">
        {!isSupabaseConfigured() ? (
          <Notice tone="warning" title="Database not connected" className="mb-6">
            Add the Supabase variables from .env.example to .env.local and restart the server to enable sign-in.
          </Notice>
        ) : null}
        {children}
      </div>
    </div>
  );
}
