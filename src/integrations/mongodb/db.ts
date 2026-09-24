import { MongoClient, type Document, type Filter } from "mongodb";
import { randomUUID } from "node:crypto";

type QueryResult<T = unknown> = { data: T | null; error: Error | null };
type OrderOptions = { ascending?: boolean; nullsFirst?: boolean };

const DEFAULTS: Record<string, Record<string, unknown>> = {
  projects: { genre: null, creative_direction: null, is_sample: false, deleted_at: null },
  chapters: { deleted_at: null },
  scenes: {
    summary: null,
    pov: null,
    location: null,
    story_time: null,
    content: null,
    plain_text: "",
    word_count: 0,
    deleted_at: null,
  },
  scene_revisions: { content: null, plain_text: "", word_count: 0, source: "author", label: null },
  author_directions: {
    scope: "project",
    chapter_id: null,
    scene_id: null,
    subject: null,
    kind: "standing",
    status: "active",
    is_inferred: false,
    confirmed: true,
  },
  observations: {
    scene_id: null,
    why_it_matters: null,
    uncertainty: null,
    status: "open",
    origin: "analysis",
    kind: "discovery",
    evidence: [],
  },
};

let client: MongoClient | undefined;

function getDatabase() {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB;
  if (!uri || !databaseName) {
    throw new Error("Missing MONGODB_URI or MONGODB_DB in the environment.");
  }

  client ??= new MongoClient(uri);
  return client.db(databaseName);
}

function project(row: Document, fields: string | null) {
  const { _id: _ignored, ...document } = row;
  if (!fields || fields === "*") return document;

  return Object.fromEntries(
    fields
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
      .map((field) => [field, document[field]]),
  );
}

class MongoQuery implements PromiseLike<QueryResult> {
  private filters: Filter<Document> = {};
  private selectedFields: string | null = null;
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Document | Document[] | null = null;
  private sorts: Record<string, 1 | -1> = {};
  private maximum: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private conflictFields: string[] = [];

  constructor(private readonly table: string) {}

  select(fields = "*") {
    this.selectedFields = fields;
    return this;
  }

  insert(payload: Document | Document[]) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Document) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(payload: Document, options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = payload;
    this.conflictFields = options?.onConflict?.split(",") ?? [];
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters[field] = value;
    return this;
  }

  neq(field: string, value: unknown) {
    this.filters[field] = { $ne: value };
    return this;
  }

  gt(field: string, value: unknown) {
    this.filters[field] = { $gt: value };
    return this;
  }

  lt(field: string, value: unknown) {
    this.filters[field] = { $lt: value };
    return this;
  }

  filter(field: string, operator: "gt" | "lt", value: unknown) {
    return operator === "gt" ? this.gt(field, value) : this.lt(field, value);
  }

  in(field: string, values: unknown[]) {
    this.filters[field] = { $in: values };
    return this;
  }

  is(field: string, value: null) {
    this.filters[field] = value;
    return this;
  }

  order(field: string, options?: OrderOptions) {
    this.sorts[field] = options?.ascending === false ? -1 : 1;
    return this;
  }

  limit(value: number) {
    this.maximum = value;
    return this;
  }

  single() {
    this.mode = "single";
    return this;
  }

  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult> {
    try {
      const collection = getDatabase().collection<Document>(this.table);
      let rows: Document[] = [];

      if (this.operation === "select") {
        const cursor = collection.find(this.filters);
        if (Object.keys(this.sorts).length) cursor.sort(this.sorts);
        if (this.maximum !== null) cursor.limit(this.maximum);
        rows = await cursor.toArray();
      }

      if (this.operation === "insert") {
        const input = Array.isArray(this.payload) ? this.payload : [this.payload!];
        rows = input.map((item) => {
          const now = new Date().toISOString();
          return {
            ...DEFAULTS[this.table],
            ...item,
            id: item.id ?? randomUUID(),
            created_at: item.created_at ?? now,
            updated_at: item.updated_at ?? now,
          };
        });
        await collection.insertMany(rows);
      }

      if (this.operation === "update") {
        await collection.updateMany(this.filters, {
          $set: { ...this.payload, updated_at: new Date().toISOString() },
        });
      }

      if (this.operation === "delete") {
        await collection.deleteMany(this.filters);
      }

      if (this.operation === "upsert") {
        const filter = Object.fromEntries(
          this.conflictFields.map((field) => [field, (this.payload as Document)[field]]),
        );
        await collection.updateOne(
          filter,
          {
            $set: { ...this.payload, updated_at: new Date().toISOString() },
            $setOnInsert: {
              ...DEFAULTS[this.table],
              id: randomUUID(),
              created_at: new Date().toISOString(),
            },
          },
          { upsert: true },
        );
      }

      const projected = rows.map((row) => project(row, this.selectedFields));
      if (this.mode === "single") {
        if (projected.length !== 1) throw new Error(`Expected one ${this.table} record.`);
        return { data: projected[0], error: null };
      }
      if (this.mode === "maybeSingle") return { data: projected[0] ?? null, error: null };
      return { data: projected, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}

export const db = {
  from(table: string) {
    return new MongoQuery(table) as any;
  },
};
