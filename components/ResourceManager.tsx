"use client";

import { useEffect, useState } from "react";

export type FieldType = "text" | "number" | "datetime" | "checkbox";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

export interface ResourceConfig {
  title: string;
  basePath: string;
  columns: { key: string; label: string }[];
  fields: FieldConfig[];
  creatable?: boolean;
  deletable?: boolean;
}

type Row = Record<string, unknown>;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    if ("name" in (value as Row)) return String((value as Row).name);
    return JSON.stringify(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

export default function ResourceManager({ config }: { config: ResourceConfig }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = search
        ? `${config.basePath}?q=${encodeURIComponent(search)}`
        : config.basePath;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setRows(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.basePath]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(config.basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setFormValues({});
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: unknown) {
    if (!confirm(`Delete ${config.title} #${id}?`)) return;
    setError(null);
    try {
      const res = await fetch(`${config.basePath}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{config.title}</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="q=field|eq|'value'"
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            onClick={load}
            className="rounded bg-zinc-200 px-3 py-1 text-sm dark:bg-zinc-800"
          >
            Search
          </button>
          {config.creatable !== false && (
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
            >
              {formOpen ? "Cancel" : "New"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {formOpen && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-2 gap-3 rounded border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-3"
        >
          {config.fields.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm">
              <span>
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </span>
              <input
                type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                required={field.required}
                value={formValues[field.key] ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          ))}
          <div className="col-span-full">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900">
            <tr>
              {config.columns.map((col) => (
                <th key={col.key} className="px-3 py-2 font-medium">
                  {col.label}
                </th>
              ))}
              {config.deletable !== false && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-3 py-4 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-3 py-4 text-center text-zinc-500">
                  No records
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={String(row.id)} className="border-t border-zinc-100 dark:border-zinc-800">
                  {config.columns.map((col) => (
                    <td key={col.key} className="px-3 py-2">
                      {formatCell(row[col.key])}
                    </td>
                  ))}
                  {config.deletable !== false && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
