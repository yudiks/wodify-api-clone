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
  initialLabel,
}: {
  lookup: NonNullable<FieldConfig["lookup"]>;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  /** Pre-resolved display label for `value`, e.g. when editing an existing record. */
  initialLabel?: string;
}) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<LookupOption | null>(
    value && initialLabel ? { id: Number(value), label: initialLabel } : null
  );
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

/** Converts a UTC ISO timestamp to the local wall-clock string <input type="datetime-local"> expects/displays. */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Formats a row's raw field value into the string a form input expects (e.g. ISO -> local datetime-local). */
function initialFieldValue(field: FieldConfig, row: Row): string {
  const raw = row[field.key];
  if (raw === null || raw === undefined) return "";
  if (field.type === "datetime" && typeof raw === "string") return toDatetimeLocalValue(raw);
  return String(raw);
}

function ResourceFormModal({
  config,
  row,
  lookupMaps,
  onClose,
  onSaved,
}: {
  config: ResourceConfig;
  /** Present when editing an existing row; absent when creating a new one. */
  row?: Row;
  /** Column-level nameLookup maps already resolved by the list, reused to pre-label lookup fields when editing. */
  lookupMaps: Record<string, Map<number, string>>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!row;
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    row
      ? Object.fromEntries(config.fields.map((field) => [field.key, initialFieldValue(field, row)]))
      : {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = isEdit ? `${config.basePath}/${row!.id}` : config.basePath;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? (isEdit ? "Update failed" : "Create failed"));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : isEdit ? "Update failed" : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? `Edit ${config.title}` : `New ${config.title}`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 transition hover:text-zinc-200"
          >
            ×
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {config.fields.map((field) => {
            const value = formValues[field.key] ?? "";
            const initialLabel =
              isEdit && value
                ? lookupMaps[field.key]?.get(Number(value)) ?? value
                : undefined;
            return (
              <label key={field.key} className="flex flex-col gap-1 text-sm text-zinc-300">
                <span>
                  {field.label}
                  {field.required && <span className="text-red-400"> *</span>}
                </span>
                {field.type === "lookup" && field.lookup ? (
                  <LookupCombobox
                    lookup={field.lookup}
                    required={field.required}
                    value={value}
                    initialLabel={initialLabel}
                    onChange={(id) => setFormValues((prev) => ({ ...prev, [field.key]: id }))}
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                    required={field.required}
                    value={value}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
                  />
                )}
              </label>
            );
          })}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-teal-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface ColumnConfig {
  key: string;
  label: string;
  /** Resolves this column's raw id into a human-readable name via a related resource. */
  nameLookup?: {
    basePath: string;
    render: (row: Row) => string;
  };
  /** Resource title (matching a ResourceConfig.title) this column's id should link to. */
  linkToResource?: string;
}

export interface ResourceConfig {
  title: string;
  basePath: string;
  columns: ColumnConfig[];
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

export default function ResourceManager({
  config,
  initialSearch,
  onNavigate,
}: {
  config: ResourceConfig;
  initialSearch?: string;
  onNavigate?: (resourceTitle: string, idFilter: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [lookupMaps, setLookupMaps] = useState<Record<string, Map<number, string>>>({});

  const lookupColumns = config.columns.filter((col) => col.nameLookup);
  const isEditable = config.fields.length > 0;
  const showActionsCol = isEditable || config.deletable !== false;

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
      const data: Row[] = json.data ?? [];
      setRows(data);
      await resolveLookups(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function resolveLookups(data: Row[]) {
    if (lookupColumns.length === 0) return;
    const maps = await Promise.all(
      lookupColumns.map(async (col) => {
        const ids = [...new Set(data.map((row) => row[col.key]).filter((v): v is number => typeof v === "number"))];
        const map = new Map<number, string>();
        if (ids.length === 0) return [col.key, map] as const;
        const res = await fetch(
          `${col.nameLookup!.basePath}?q=id|in|{${ids.join(",")}}&pageSize=200`
        );
        const json = await res.json();
        if (res.ok) {
          for (const related of json.data ?? []) {
            map.set(related.id, col.nameLookup!.render(related));
          }
        }
        return [col.key, map] as const;
      })
    );
    setLookupMaps(Object.fromEntries(maps));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.basePath]);

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
              onClick={() => setFormOpen(true)}
              className="rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-zinc-950 transition hover:bg-teal-400"
            >
              {config.useMemberModal ? "Add Member" : "New"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

      {formOpen && config.useMemberModal && (
        <AddMemberModal onClose={() => setFormOpen(false)} onCreated={load} />
      )}

      {formOpen && !config.useMemberModal && (
        <ResourceFormModal
          config={config}
          lookupMaps={lookupMaps}
          onClose={() => setFormOpen(false)}
          onSaved={load}
        />
      )}

      {editingRow && (
        <ResourceFormModal
          config={config}
          row={editingRow}
          lookupMaps={lookupMaps}
          onClose={() => setEditingRow(null)}
          onSaved={load}
        />
      )}

      <div className="flex flex-col rounded border border-zinc-800">
        {/* Header row */}
        <div className="flex items-center border-b border-zinc-800 px-4 py-3">
          {config.columns.map((col) => (
            <div key={col.key} className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-500">
              {col.label}
            </div>
          ))}
          {showActionsCol && <div className="w-40 shrink-0" />}
        </div>

        {loading && <div className="py-12 text-center text-sm text-zinc-500">Loading…</div>}

        {!loading && rows.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-500">No records</div>
        )}

        {!loading &&
          rows.map((row) => (
            <div key={String(row.id)} className="flex items-center border-b border-zinc-800 px-4 py-3">
              {config.columns.map((col) => {
                const rawValue = row[col.key];
                const label = col.nameLookup
                  ? lookupMaps[col.key]?.get(rawValue as number) ?? formatCell(rawValue)
                  : formatCell(rawValue);
                const canLink = col.linkToResource && onNavigate && typeof rawValue === "number";
                return (
                  <div
                    key={col.key}
                    className={`min-w-0 flex-1 truncate text-sm ${
                      col.key === "id" ? "text-zinc-500" : "text-zinc-100"
                    }`}
                  >
                    {canLink ? (
                      <button
                        type="button"
                        onClick={() => onNavigate!(col.linkToResource!, rawValue as number)}
                        className="truncate text-teal-400 hover:underline"
                      >
                        {label}
                      </button>
                    ) : (
                      label
                    )}
                  </div>
                );
              })}
              {showActionsCol && (
                <div className="flex w-40 shrink-0 items-center justify-end gap-2">
                  {isEditable && (
                    <button
                      onClick={() => setEditingRow(row)}
                      className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
                    >
                      Edit
                    </button>
                  )}
                  {config.deletable !== false && (
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
