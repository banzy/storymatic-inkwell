import { createFileRoute, redirect } from "@tanstack/react-router";

// Kept as a compatibility route for old bookmarks while local access has no login.
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Storymatic" },
      { name: "description", content: "Sign in to continue developing and writing your books in Storymatic." },
      { property: "og:title", content: "Sign in — Storymatic" },
      { property: "og:description", content: "Sign in to continue developing and writing your books in Storymatic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
});
