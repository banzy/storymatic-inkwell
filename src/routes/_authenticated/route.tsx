import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) return { user: data.user };

    // Temporary: sign-in is skipped — start a guest session instead of redirecting.
    const guest = await supabase.auth.signInAnonymously();
    if (guest.error || !guest.data.user) throw redirect({ to: "/auth" });
    return { user: guest.data.user };
  },

  component: () => <Outlet />,
});
