import postgres from "postgres";

type TestJson =
  | null
  | boolean
  | number
  | string
  | readonly TestJson[]
  | { readonly [key: string]: TestJson };

type TestSqlValue =
  | null
  | boolean
  | number
  | string
  | Date
  | Uint8Array
  | readonly TestSqlValue[]
  | ReturnType<ReturnType<typeof postgres>["json"]>;

export function postgresTestAdapter(databaseUrl: string) {
  const client = postgres(databaseUrl, { idle_timeout: 1 });
  const query = (
    strings: TemplateStringsArray,
    ...values: readonly TestSqlValue[]
  ) => client(
    strings,
    ...values.map((value) => {
      if (typeof value !== "string" || !/^[{\[]/.test(value)) return value;
      try {
        return client.json(JSON.parse(value) as TestJson);
      } catch {
        return value;
      }
    }),
  );
  return Object.assign(query, {
    async transaction(queries: readonly PromiseLike<Record<string, unknown>[]>[]) {
      const results: Record<string, unknown>[][] = [];
      for (const pending of queries) results.push(await pending);
      return results;
    },
  });
}
