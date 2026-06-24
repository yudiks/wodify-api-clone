"use client";

import { useEffect, useRef, useState } from "react";

interface MembershipTemplate {
  id: number;
  name: string;
  price: number | null;
}

interface AddMemberModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddMemberModal({ onClose, onCreated }: AddMemberModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [membershipQuery, setMembershipQuery] = useState("");
  const [membershipResults, setMembershipResults] = useState<MembershipTemplate[]>([]);
  const [membershipDropdownOpen, setMembershipDropdownOpen] = useState(false);
  const [membershipSearching, setMembershipSearching] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MembershipTemplate | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedTemplate) return; // don't search once a template is chosen
    if (!membershipQuery.trim()) {
      setMembershipResults([]);
      setMembershipDropdownOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setMembershipSearching(true);
      try {
        const filter = `name|like|'${encodeURIComponent(membershipQuery.trim())}'`;
        const res = await fetch(`/api/v1/membership-templates?q=${filter}`);
        const json = await res.json();
        if (res.ok) {
          setMembershipResults(json.data ?? []);
          setMembershipDropdownOpen(true);
        }
      } catch {
        // ignore lookup errors, not critical to the form
      } finally {
        setMembershipSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [membershipQuery, selectedTemplate]);

  function handleSelectTemplate(t: MembershipTemplate) {
    setSelectedTemplate(t);
    setMembershipQuery(t.name);
    setMembershipDropdownOpen(false);
  }

  function handleClearTemplate() {
    setSelectedTemplate(null);
    setMembershipQuery("");
    setMembershipResults([]);
    setMembershipDropdownOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      firstName,
      lastName,
    };
    if (email.trim()) body.email = email.trim();
    if (phone.trim()) body.phone = phone.trim();
    if (selectedTemplate) body.membershipTemplateId = selectedTemplate.id;

    try {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Member</h2>
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
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span>
              First name<span className="text-red-400"> *</span>
            </span>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span>
              Last name<span className="text-red-400"> *</span>
            </span>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span>Phone</span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
            />
          </label>

          <div className="relative flex flex-col gap-1 text-sm text-zinc-300">
            <span>Membership (optional)</span>
            <div className="relative">
              <input
                type="text"
                value={membershipQuery}
                disabled={!!selectedTemplate}
                onChange={(e) => setMembershipQuery(e.target.value)}
                onFocus={() => {
                  if (membershipResults.length > 0 && !selectedTemplate) setMembershipDropdownOpen(true);
                }}
                placeholder="Search membership templates…"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 pr-16 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none disabled:opacity-70"
              />
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={handleClearTemplate}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Clear
                </button>
              )}
            </div>

            {membershipDropdownOpen && !selectedTemplate && (
              <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded border border-zinc-700 bg-zinc-800 shadow-lg">
                {membershipSearching && (
                  <div className="px-3 py-2 text-sm text-zinc-500">Searching…</div>
                )}
                {!membershipSearching && membershipResults.length === 0 && (
                  <div className="px-3 py-2 text-sm text-zinc-500">No matches</div>
                )}
                {!membershipSearching &&
                  membershipResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTemplate(t)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="ml-2 shrink-0 text-zinc-400">
                        {t.price != null ? `$${t.price}` : ""}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

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
              {submitting ? "Saving…" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
