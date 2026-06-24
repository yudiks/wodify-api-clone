"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface ClassRow {
  id: number;
  name: string;
  program: string | null;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  location: string | null;
  spotsRemaining: number;
}

interface ReservationRow {
  id: number;
  status: string;
  createdDate: string;
  class: ClassRow;
}

type Tab = "classes" | "reservations";

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const isoWeekday = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - isoWeekday);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export default function ClientPortal() {
  const [client, setClient] = useState<Client | null | undefined>(undefined); // undefined = loading
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authForm, setAuthForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [tab, setTab] = useState<Tab>("classes");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  async function loadMe() {
    const { ok, body } = await api<Client>("/api/v1/portal/me");
    setClient(ok ? body : null);
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function loadClasses() {
    setLoadingData(true);
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 7).toISOString();
    const { body } = await api<{ data: ClassRow[] }>(
      `/api/v1/portal/classes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    setClasses(body.data ?? []);
    setLoadingData(false);
  }

  async function loadReservations() {
    setLoadingData(true);
    const { body } = await api<{ data: ReservationRow[] }>("/api/v1/portal/reservations");
    setReservations(body.data ?? []);
    setLoadingData(false);
  }

  useEffect(() => {
    if (!client) return;
    if (tab === "classes") loadClasses();
    else loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, tab, weekStart]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    const url = authMode === "signin" ? "/api/v1/portal/signin" : "/api/v1/portal/signup";
    const payload =
      authMode === "signin"
        ? { email: authForm.email, password: authForm.password }
        : authForm;
    const { ok, body } = await api<Client & { error?: string }>(url, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthSubmitting(false);
    if (!ok) {
      setAuthError((body as { error?: string }).error ?? "Something went wrong");
      return;
    }
    setClient(body);
  }

  async function handleSignOut() {
    await api("/api/v1/portal/signout", { method: "POST" });
    setClient(null);
    setClasses([]);
    setReservations([]);
  }

  async function handleReserve(classId: number) {
    setActionError(null);
    const { ok, body } = await api<{ error?: string }>(`/api/v1/portal/classes/${classId}/reserve`, {
      method: "POST",
    });
    if (!ok) {
      setActionError(body.error ?? "Could not reserve");
      return;
    }
    await loadClasses();
  }

  async function handleCancel(reservationId: number) {
    setActionError(null);
    const { ok, body } = await api<{ error?: string }>(`/api/v1/portal/reservations/${reservationId}/cancel`, {
      method: "PUT",
    });
    if (!ok) {
      setActionError(body.error ?? "Could not cancel");
      return;
    }
    await loadReservations();
  }

  if (client === undefined) {
    return <div className="p-6 text-sm text-zinc-500">Loading…</div>;
  }

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded border border-zinc-200 p-6 dark:border-zinc-800">
          <h1 className="mb-1 text-xl font-bold">Member Portal</h1>
          <p className="mb-4 text-sm text-zinc-500">
            {authMode === "signin" ? "Sign in to reserve classes." : "Create an account to get started."}
          </p>

          <div className="mb-4 flex gap-2 text-sm">
            <button
              onClick={() => setAuthMode("signin")}
              className={`rounded px-3 py-1 ${authMode === "signin" ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-900"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`rounded px-3 py-1 ${authMode === "signup" ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-900"}`}
            >
              Sign up
            </button>
          </div>

          {authError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {authError}
            </p>
          )}

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
            {authMode === "signup" && (
              <>
                <input
                  placeholder="First name"
                  required
                  value={authForm.firstName}
                  onChange={(e) => setAuthForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <input
                  placeholder="Last name"
                  required
                  value={authForm.lastName}
                  onChange={(e) => setAuthForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="password"
              placeholder="Password"
              required
              minLength={8}
              value={authForm.password}
              onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={authSubmitting}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {authSubmitting ? "Please wait…" : authMode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <Link href="/" className="mt-4 block text-center text-xs text-zinc-500 hover:underline">
            Admin dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Member Portal</h1>
          <p className="text-sm text-zinc-500">
            Welcome, {client.firstName} {client.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            Admin dashboard
          </Link>
          <button onClick={handleSignOut} className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-900">
            Sign out
          </button>
        </div>
      </header>

      <nav className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <button
          onClick={() => setTab("classes")}
          className={`rounded px-3 py-1.5 text-sm ${tab === "classes" ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"}`}
        >
          Classes
        </button>
        <button
          onClick={() => setTab("reservations")}
          className={`rounded px-3 py-1.5 text-sm ${tab === "reservations" ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"}`}
        >
          My Reservations
        </button>
      </nav>

      {actionError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </p>
      )}

      {tab === "classes" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-900"
            >
              ← Previous week
            </button>
            <div className="text-sm font-medium">
              {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
              {addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-900"
              >
                Today
              </button>
              <button
                onClick={() => setWeekStart((d) => addDays(d, 7))}
                className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-900"
              >
                Next week →
              </button>
            </div>
          </div>

          {loadingData && <div className="py-8 text-center text-sm text-zinc-500">Loading…</div>}

          {!loadingData && (
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded border border-zinc-200 bg-zinc-200 sm:grid-cols-7 dark:border-zinc-800 dark:bg-zinc-800">
              {WEEKDAY_LABELS.map((label, i) => {
                const day = addDays(weekStart, i);
                const isToday = sameDay(day, new Date());
                const dayClasses = classes
                  .filter((c) => sameDay(new Date(c.startDateTime), day))
                  .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

                return (
                  <div key={label} className="flex min-h-[10rem] flex-col gap-2 bg-white p-2 dark:bg-zinc-950">
                    <div
                      className={`flex items-baseline justify-between border-b pb-1 text-xs font-semibold ${
                        isToday ? "border-blue-600 text-blue-600" : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
                      }`}
                    >
                      <span>{label}</span>
                      <span>{day.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
                    </div>

                    {dayClasses.length === 0 && (
                      <p className="text-xs text-zinc-400">No classes</p>
                    )}

                    {dayClasses.map((c) => (
                      <div
                        key={c.id}
                        className="rounded border border-zinc-200 p-2 text-xs dark:border-zinc-800"
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-zinc-500">
                          {new Date(c.startDateTime).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {c.program ? ` · ${c.program}` : ""}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className={c.spotsRemaining > 0 ? "text-zinc-500" : "text-amber-600"}>
                            {c.spotsRemaining > 0 ? `${c.spotsRemaining} spots left` : "Waitlist"}
                          </span>
                          <button
                            onClick={() => handleReserve(c.id)}
                            className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white"
                          >
                            Reserve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "reservations" && (
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Starts</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loadingData && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-zinc-500">Loading…</td>
                </tr>
              )}
              {!loadingData && reservations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-zinc-500">No reservations yet</td>
                </tr>
              )}
              {!loadingData &&
                reservations.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-2">{r.class.name}</td>
                    <td className="px-3 py-2">{new Date(r.class.startDateTime).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-right">
                      {r.status !== "Cancelled" && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
