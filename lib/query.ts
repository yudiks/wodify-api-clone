// Parses Wodify's `q=field|operator|value` search syntax into a Prisma `where` clause.
// Conditions joined by `;` are AND'd together.
// Supported operators: eq, neq, lt, lte, gt, gte, like, in, not_in, between, is_null, not_null

type WhereClause = Record<string, unknown>;

function coerceValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (!Number.isNaN(Date.parse(trimmed)) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return new Date(trimmed);
  }
  return trimmed;
}

function coerceList(raw: string): unknown[] {
  const inner = raw.trim().replace(/^\{/, "").replace(/\}$/, "");
  return inner.split(",").map((v) => coerceValue(v));
}

export function parseSearchQuery(q: string | null): WhereClause | undefined {
  if (!q) return undefined;
  const conditions = q
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);

  if (conditions.length === 0) return undefined;

  const clauses: WhereClause[] = conditions.map((condition) => {
    const parts = condition.split("|");
    const [field, operator, ...rest] = parts;
    if (!field || !operator) {
      throw new QueryParseError(`Invalid query condition: "${condition}"`);
    }

    switch (operator) {
      case "eq":
        return { [field]: coerceValue(rest[0]) };
      case "neq":
        return { [field]: { not: coerceValue(rest[0]) } };
      case "lt":
        return { [field]: { lt: coerceValue(rest[0]) } };
      case "lte":
        return { [field]: { lte: coerceValue(rest[0]) } };
      case "gt":
        return { [field]: { gt: coerceValue(rest[0]) } };
      case "gte":
        return { [field]: { gte: coerceValue(rest[0]) } };
      case "like": {
        const value = coerceValue(rest[0]);
        return { [field]: { contains: String(value), mode: "insensitive" } };
      }
      case "in":
        return { [field]: { in: coerceList(rest[0]) } };
      case "not_in":
        return { [field]: { notIn: coerceList(rest[0]) } };
      case "between":
        return { [field]: { gte: coerceValue(rest[0]), lte: coerceValue(rest[1]) } };
      case "is_null":
        return { [field]: null };
      case "not_null":
        return { [field]: { not: null } };
      default:
        throw new QueryParseError(`Unsupported operator: "${operator}"`);
    }
  });

  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

export class QueryParseError extends Error {}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "50", 10) || 50)
  );
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
