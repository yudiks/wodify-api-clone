"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import WorkoutView from "@/components/WorkoutView";
import {
  addDays,
  avatarColor,
  durationMinutes,
  formatTimeLong,
  formatTimeShort,
  portalApi as api,
  sameDay,
  startOfWeek,
  WEEKDAY_LABELS,
} from "@/lib/portal-format";

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

type Tab = "classes" | "reservations" | "workout";

export default function ClientPortal() {
  const [client, setClient] = useState<Client | null | undefined>(undefined); // undefined = loading
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authForm, setAuthForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("classes");
  const [workoutInitialDate, setWorkoutInitialDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "workout" || t === "reservations" || t === "classes") setTab(t);
    const d = searchParams.get("date");
    setWorkoutInitialDate(d ? new Date(d) : undefined);
  }, [searchParams]);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
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
    const { body } = await api<{ data: ReservationRow[] }>("/api/v1/portal/reservations");
    setReservations(body.data ?? []);
  }

  useEffect(() => {
    if (!client) return;
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, weekStart]);

  useEffect(() => {
    if (!client) return;
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

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
    await Promise.all([loadClasses(), loadReservations()]);
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
    await Promise.all([loadClasses(), loadReservations()]);
  }

  function reservationFor(classId: number): ReservationRow | undefined {
    return reservations.find((r) => r.class.id === classId && r.status !== "Cancelled");
  }

  if (client === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 p-6">
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="mb-1 text-xl font-bold text-white">Member Portal</h1>
          <p className="mb-4 text-sm text-zinc-400">
            {authMode === "signin" ? "Sign in to reserve classes." : "Create an account to get started."}
          </p>

          <div className="mb-4 flex gap-2 text-sm">
            <button
              onClick={() => setAuthMode("signin")}
              className={`rounded px-3 py-1 transition ${
                authMode === "signin" ? "bg-teal-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`rounded px-3 py-1 transition ${
                authMode === "signup" ? "bg-teal-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              Sign up
            </button>
          </div>

          {authError && (
            <p className="mb-3 rounded bg-red-950 px-3 py-2 text-sm text-red-300">{authError}</p>
          )}

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
            {authMode === "signup" && (
              <>
                <input
                  placeholder="First name"
                  required
                  value={authForm.firstName}
                  onChange={(e) => setAuthForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
                />
                <input
                  placeholder="Last name"
                  required
                  value={authForm.lastName}
                  onChange={(e) => setAuthForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              required
              minLength={8}
              value={authForm.password}
              onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={authSubmitting}
              className="rounded bg-teal-500 px-3 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50"
            >
              {authSubmitting ? "Please wait…" : authMode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <Link href="/" className="mt-4 block text-center text-xs text-zinc-500 hover:text-zinc-300 hover:underline">
            Admin dashboard
          </Link>
        </div>
      </div>
    );
  }

  const dayClasses = classes
    .filter((c) => sameDay(new Date(c.startDateTime), selectedDay))
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 text-zinc-100">
      {/* App bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-zinc-950">
          {client.firstName[0]}
          {client.lastName[0]}
        </div>
        <h1 className="text-base font-semibold text-white">Schedule</h1>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/" className="text-zinc-400 hover:text-zinc-200">
            Admin
          </Link>
          <button onClick={handleSignOut} className="text-zinc-400 hover:text-zinc-200">
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-6 border-b border-zinc-800 px-4">
        <button
          onClick={() => setTab("classes")}
          className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
            tab === "classes" ? "border-teal-400 text-teal-400" : "border-transparent text-zinc-500"
          }`}
        >
          Classes
        </button>
        <button
          onClick={() => setTab("reservations")}
          className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
            tab === "reservations" ? "border-teal-400 text-teal-400" : "border-transparent text-zinc-500"
          }`}
        >
          My Reservations
        </button>
        <button
          onClick={() => setTab("workout")}
          className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
            tab === "workout" ? "border-teal-400 text-teal-400" : "border-transparent text-zinc-500"
          }`}
        >
          Workout
        </button>
      </nav>

      {actionError && (
        <p className="mx-4 mt-3 rounded bg-red-950 px-3 py-2 text-sm text-red-300">{actionError}</p>
      )}

      {tab === "classes" && (
        <div className="flex flex-1 flex-col">
          {/* Day strip */}
          <div className="flex items-center gap-1 border-b border-zinc-800 px-2 py-3">
            <button
              onClick={() => {
                const prev = addDays(weekStart, -7);
                setWeekStart(prev);
                setSelectedDay(prev);
              }}
              className="px-1 text-zinc-500 hover:text-zinc-300"
              aria-label="Previous week"
            >
              ‹
            </button>
            <div className="grid flex-1 grid-cols-7 text-center">
              {WEEKDAY_LABELS.map((label, i) => {
                const day = addDays(weekStart, i);
                const isSelected = sameDay(day, selectedDay);
                const isToday = sameDay(day, new Date());
                return (
                  <button
                    key={label}
                    onClick={() => setSelectedDay(day)}
                    className="flex flex-col items-center gap-1 py-1"
                  >
                    <span className={`text-[11px] ${isToday ? "text-zinc-300" : "text-zinc-500"}`}>{label}</span>
                    <span
                      className={`text-sm font-semibold ${
                        isSelected
                          ? "border-b-2 border-teal-400 pb-0.5 text-teal-400"
                          : isToday
                            ? "text-zinc-100"
                            : "text-zinc-500"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const next = addDays(weekStart, 7);
                setWeekStart(next);
                setSelectedDay(next);
              }}
              className="px-1 text-zinc-500 hover:text-zinc-300"
              aria-label="Next week"
            >
              ›
            </button>
          </div>

          {/* Class list */}
          <div className="flex flex-col">
            {loadingData && <div className="py-8 text-center text-sm text-zinc-500">Loading…</div>}

            {!loadingData && dayClasses.length === 0 && (
              <div className="py-12 text-center text-sm text-zinc-500">No classes scheduled this day</div>
            )}

            {!loadingData &&
              dayClasses.map((c) => {
                const start = new Date(c.startDateTime);
                const end = new Date(c.endDateTime);
                const reservation = reservationFor(c.id);
                const reservedCount = c.capacity - c.spotsRemaining;

                return (
                  <div key={c.id} className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
                    <Link href={`/portal/classes/${c.id}`} className="w-16 shrink-0">
                      <div className="text-sm font-medium text-zinc-100">{formatTimeShort(start)}</div>
                      <div className="text-xs text-zinc-500">{durationMinutes(start, end)} min</div>
                    </Link>

                    <Link href={`/portal/classes/${c.id}`} className="min-w-0 flex-1">
                      <div className={`truncate text-sm ${reservation ? "font-medium text-teal-400" : "text-zinc-100"}`}>
                        {c.name}: {formatTimeLong(start)}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {reservedCount} | {c.capacity}
                        {c.program ? ` · ${c.program}` : ""}
                      </div>
                    </Link>

                    {reservation ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          reservation.status === "Waitlisted"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-zinc-700 text-zinc-200"
                        }`}
                      >
                        {reservation.status === "Waitlisted" ? "WAITLISTED" : "RESERVED"}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleReserve(c.id)}
                        className="shrink-0 rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-zinc-950 transition hover:bg-teal-400"
                      >
                        Reserve
                      </button>
                    )}

                    <div
                      className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white sm:flex ${avatarColor(
                        c.program ?? c.name
                      )}`}
                    >
                      {(c.program ?? c.name)[0]}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {tab === "reservations" && (
        <div className="flex flex-col">
          {reservations.length === 0 && (
            <div className="py-12 text-center text-sm text-zinc-500">No reservations yet</div>
          )}
          {reservations.map((r) => {
            const start = new Date(r.class.startDateTime);
            return (
              <div key={r.id} className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
                <Link href={`/portal/classes/${r.class.id}`} className="w-16 shrink-0">
                  <div className="text-sm font-medium text-zinc-100">{formatTimeShort(start)}</div>
                  <div className="text-xs text-zinc-500">{start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                </Link>
                <Link href={`/portal/classes/${r.class.id}`} className="min-w-0 flex-1">
                  <div className="truncate text-sm text-zinc-100">{r.class.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{r.status}</div>
                </Link>
                {r.status !== "Cancelled" && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    className="shrink-0 rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "workout" && <WorkoutView initialDate={workoutInitialDate} />}
    </div>
  );
}
