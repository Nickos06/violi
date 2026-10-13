// One-off: copies everything from the old local SQLite database (prisma/dev.db) into the Postgres
// database in DATABASE_URL. Safe to re-run: rows that already exist are skipped.
//   npm run db:copy-local
// Sessions and OAuth states are not copied (everyone just signs in again).
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const SKIP = new Set(["Session", "OAuthState"]);
const sqlite = new DatabaseSync(path.join(__dirname, "dev.db"), { readOnly: true });
const db = new PrismaClient();

type Model = (typeof Prisma.dmmf.datamodel.models)[number];

// Parents before children, following foreign keys.
function ordered(models: readonly Model[]) {
  const deps = new Map(models.map((m) => [m.name, new Set(m.fields.filter((f) => f.kind === "object" && f.relationFromFields?.length && f.type !== m.name).map((f) => f.type))]));
  const out: Model[] = [], done = new Set<string>();
  while (out.length < models.length) {
    const next = models.filter((m) => !done.has(m.name) && [...deps.get(m.name)!].every((d) => done.has(d)));
    if (!next.length) throw new Error("relation cycle");
    for (const m of next) { out.push(m); done.add(m.name); }
  }
  return out;
}

function convert(m: Model, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of m.fields) {
    if (f.kind === "object" || !(f.name in row)) continue;
    const v = row[f.name];
    if (v == null) { out[f.name] = f.type === "Json" ? Prisma.DbNull : null; continue; }
    switch (f.type) {
      case "DateTime": out[f.name] = new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : (v as string | number)); break;
      case "Boolean": out[f.name] = v === 1 || v === true || v === "1" || v === "true"; break;
      case "Json": out[f.name] = typeof v === "string" ? JSON.parse(v) : v; break;
      case "Int": out[f.name] = Number(v); break;
      case "Float": out[f.name] = Number(v); break;
      default: out[f.name] = v;
    }
  }
  return out;
}

(async () => {
  for (const m of ordered(Prisma.dmmf.datamodel.models)) {
    if (SKIP.has(m.name)) continue;
    const rows = sqlite.prepare(`select * from "${m.name}"`).all() as Record<string, unknown>[];
    const delegate = (db as unknown as Record<string, { createMany: (a: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }> }>)[m.name[0].toLowerCase() + m.name.slice(1)];
    let n = 0;
    for (let i = 0; i < rows.length; i += 500) n += (await delegate.createMany({ data: rows.slice(i, i + 500).map((r) => convert(m, r)), skipDuplicates: true })).count;
    console.log(`${m.name.padEnd(16)} ${n}/${rows.length}`);
  }
  await db.$disconnect();
})().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
