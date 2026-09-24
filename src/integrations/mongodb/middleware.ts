import { createMiddleware } from "@tanstack/react-start";
import { db } from "./db";

/**
 * Local development uses one MongoDB database and intentionally has no account
 * gate. The fixed owner id keeps the existing project shape compatible while
 * server functions no longer depend on hosted authentication.
 */
export const requireLocalDatabase = createMiddleware({ type: "function" }).server(
  async ({ next }) =>
    next({
      context: {
        db,
        userId: "local",
      },
    }),
);
