import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const project = z.object({ projectId: z.string().uuid() });
async function engine() {
  const [{ getDatabase }, { EngineStore }, { CollaborationEngine }] = await Promise.all([
    import("@/integrations/mongodb/db"),
    import("./engine/store.server"),
    import("./engine/service.server"),
  ]);
  return new CollaborationEngine(new EngineStore(getDatabase()));
}

export const getBookEngine = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => project.parse(input))
  .handler(async ({ data }) => {
    const service = await engine();
    return {
      project: await service.store.project(data.projectId),
      state: await service.store.load(data.projectId),
    };
  });

export const sendBookMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    project
      .extend({ requestId: z.string().uuid(), message: z.string().trim().min(1).max(30000) })
      .parse(input),
  )
  .handler(async ({ data }) => (await engine()).send(data.projectId, data.requestId, data.message));

export const reviewBookChanges = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    project
      .extend({
        revision: z.number().int().nonnegative(),
        turnId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(20),
        action: z.enum(["adopt", "dismiss"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) =>
    (await engine()).review(data.projectId, data.revision, data.turnId, data.ids, data.action),
  );

export const undoBookChange = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    project
      .extend({ revision: z.number().int().nonnegative(), changeId: z.string().max(100) })
      .parse(input),
  )
  .handler(async ({ data }) => (await engine()).undo(data.projectId, data.revision, data.changeId));

export const adoptBookDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    project
      .extend({ revision: z.number().int().nonnegative(), turnId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data }) =>
    (await engine()).adoptDraft(data.projectId, data.revision, data.turnId),
  );
