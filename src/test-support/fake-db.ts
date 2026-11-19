// A recording stand-in for the Supabase client, so tests can check which filters every query carries.

export type Call = {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  filters: [string, unknown][];
  values?: unknown;
};

type Answer = { data?: unknown; error?: { message: string } | null; count?: number };

export function createFakeDb(answers: Record<string, Answer | ((call: Call) => Answer)> = {}) {
  const calls: Call[] = [];

  function from(table: string) {
    const call: Call = { table, op: "select", filters: [] };
    let opSet = false;
    calls.push(call);

    const setOp = (op: Call["op"], values?: unknown) => {
      if (!opSet) {
        call.op = op;
        call.values = values;
        opSet = true;
      }
    };
    const answer = (): { data: unknown; error: { message: string } | null; count?: number } => {
      const a = answers[`${table}.${call.op}`];
      const r = typeof a === "function" ? a(call) : (a ?? {});
      return { data: r.data ?? null, error: r.error ?? null, count: r.count };
    };

    const builder: Record<string, unknown> = {
      select: () => {
        setOp("select");
        return builder;
      },
      insert: (values: unknown) => {
        setOp("insert", values);
        return builder;
      },
      update: (values: unknown) => {
        setOp("update", values);
        return builder;
      },
      delete: () => {
        setOp("delete");
        return builder;
      },
      upsert: (values: unknown) => {
        setOp("upsert", values);
        return builder;
      },
      eq: (col: string, val: unknown) => {
        call.filters.push([col, val]);
        return builder;
      },
      is: (col: string, val: unknown) => {
        call.filters.push([col, val]);
        return builder;
      },
      lte: (col: string, val: unknown) => {
        call.filters.push([col, val]);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(answer()),
      single: () => Promise.resolve(answer()),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(answer()).then(resolve, reject),
    };
    return builder;
  }

  return { db: { from }, calls };
}

/** True when the call is limited to this user. */
export function scopedTo(call: Call, userId: string): boolean {
  return call.filters.some(([col, val]) => col === "user_id" && val === userId);
}
