import { createFileRoute, redirect } from "@tanstack/react-router";

// Kept as a compatibility route for old bookmarks while local access has no login.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
});
