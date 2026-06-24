"use client";

import { useEffect, useRef, useState } from "react";
import AddMemberModal from "@/components/AddMemberModal";

export type FieldType = "text" | "number" | "datetime" | "checkbox" | "lookup";

export interface LookupOption {
  id: number;
  label: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Required when type === "lookup": resolves a search string to matching options. */
  lookup?: {
    fetchOptions: (query: string) => Promise<LookupOption[]>;
    placeholder?: string;
  };
}

function LookupCombobox({
  lookup,
  value,
  onChange,
  required,
}: {
  lookup: NonNullable<FieldConfig["lookup"]>;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (!query.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await lookup.fetchOptions(query.trim());
        setOptions(results);
        setOpen(true);
      } catch {
        // ignore lookup errors, not critical to the form
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  // If the form was reset externally (e.g. after a successful save), clear local state too.
  useEffect(() => {
    if (value === "" && selected) {
      setSelected(null);
      setQuery("");
    }
  }, [value, selected]);

  function handleSelect(opt: LookupOption) {
    setSelected(opt);
    setQuery(opt.label);
    setOpen(false);
    onChange(String(opt.id));
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    setOptions([]);
    setOpen(false);
    onChange("");
  }

  return (
    <div className="relative">
      <input
        type="text"
        required={required && !value}
        value={query}
        disabled={!!selected}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (options.length > 0 && !selected) setOpen(true);
        }}
        placeholder={lookup.placeholder ?? "Search…"}
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 pr-14 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none disabled:opacity-70"
      />
      {selected && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Clear
        </button>
      )}
      {open && !selected && (
        <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded border border-zinc-700 bg-zinc-800 shadow-lg">
          {searching && <div className="px-3 py-2 text-sm text-zinc-500">Searching…</div>}
          {!searching && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500">No matches</div>
          )}
          {!searching &&
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt)}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
              >
                {opt.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export interface ResourceConfig {
  title: string;
  basePath: string;
  columns: { key: string; label: string }[];
  fields: FieldConfig[];
  creatable?: boolean;
  deletable?: boolean;
  useMemberModal?: boolean;
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
    <div className="flex flex-col gap-4 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{config.title}</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="q=field|eq|'value'"
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
          />
          <button
            onClick={load}
            className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
          >
            Search
          </button>
          {config.creatable !== false && (
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-zinc-950 transition hover:bg-teal-400"
            >
              {config.useMemberModal ? "Add Member" : formOpen ? "Cancel" : "New"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

      {formOpen && config.useMemberModal && (
        <AddMemberModal onClose={() => setFormOpen(false)} onCreated={load} />
      )}

      {formOpen && !config.useMemberModal && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-2 gap-3 rounded border border-zinc-800 p-3 sm:grid-cols-3"
        >
          {config.fields.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm text-zinc-300">
              <span>
                {field.label}
                {field.required && <span className="text-red-400"> *</span>}
              </span>
              {field.type === "lookup" && field.lookup ? (
                <LookupCombobox
                  lookup={field.lookup}
                  required={field.required}
                  value={formValues[field.key] ?? ""}
                  onChange={(id) => setFormValues((prev) => ({ ...prev, [field.key]: id }))}
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                  required={field.required}
                  value={formValues[field.key] ?? ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
                />
              )}
            </label>
          ))}
          <div className="col-span-full">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-teal-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col rounded border border-zinc-800">
        {/* Header row */}
        <div className="flex items-center border-b border-zinc-800 px-4 py-3">
          {config.columns.map((col) => (
            <div key={col.key} className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-500">
              {col.label}
            </div>
          ))}
          {config.deletable !== false && <div className="w-20 shrink-0" />}
        </div>

        {loading && <div className="py-12 text-center text-sm text-zinc-500">Loading…</div>}

        {!loading && rows.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-500">No records</div>
        )}

        {!loading &&
          rows.map((row) => (
            <div key={String(row.id)} className="flex items-center border-b border-zinc-800 px-4 py-3">
              {config.columns.map((col) => (
                <div key={col.key} className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                  {formatCell(row[col.key])}
                </div>
              ))}
              {config.deletable !== false && (
                <div className="w-20 shrink-0 text-right">
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
