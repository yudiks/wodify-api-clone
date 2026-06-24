"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  avatarColor,
  durationMinutes,
  formatDateLong,
  formatTimeLong,
  portalApi as api,
} from "@/lib/portal-format";

interface Attendee {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
}

interface ClassDetailData {
  id: number;
  name: string;
  program: string | null;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  location: string | null;
  coach: { id: number; firstName: string; lastName: string } | null;
  spotsRemaining: number;
  attendees: Attendee[];
  myReservation: { id: number; status: string } | null;
}

export default function ClassDetail({ classId }: { classId: string }) {
  const [data, setData] = useState<ClassDetailData | null | undefined>(undefined); // undefined = loading
  const [unauthorized, setUnauthorized] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { ok, status, body } = await api<ClassDetailData>(`/api/v1/portal/classes/${classId}`);
    if (status === 401) {
      setUnauthorized(true);
      return;
    }
    setData(ok ? body : null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function handleReserve() {
    setSubmitting(true);
    setActionError(null);
    const { ok, body } = await api<{ error?: string }>(`/api/v1/portal/classes/${classId}/reserve`, {
      method: "POST",
    });
    setSubmitting(false);
    if (!ok) {
      setActionError(body.error ?? "Could not reserve");
      return;
    }
    await load();
  }

  async function handleCancel(reservationId: number) {
    setSubmitting(true);
    setActionError(null);
    const { ok, body } = await api<{ error?: string }>(`/api/v1/portal/reservations/${reservationId}/cancel`, {
      method: "PUT",
    });
    setSubmitting(false);
    if (!ok) {
      setActionError(body.error ?? "Could not cancel");
      return;
    }
    await load();
  }

  if (unauthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
        <p className="text-sm text-zinc-400">Please sign in to view this class.</p>
        <Link href="/portal" className="text-sm font-medium text-teal-400 hover:underline">
          Go to Member Portal
        </Link>
      </div>
    );
  }

  if (data === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">Loading…</div>;
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
        <p className="text-sm text-zinc-400">Class not found.</p>
        <Link href="/portal" className="text-sm font-medium text-teal-400 hover:underline">
          Back to Schedule
        </Link>
      </div>
    );
  }

  const start = new Date(data.startDateTime);
  const end = new Date(data.endDateTime);
  const reservedCount = data.capacity - data.spotsRemaining;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 pb-24 text-zinc-100">
      <header className="px-4 py-3">
        <Link href="/portal" className="inline-flex text-teal-400" aria-label="Back to Schedule">
          ‹
        </Link>
      </header>

      <div className="px-4">
        <h1 className="text-xl font-bold text-white">
          {data.name}: {formatTimeLong(start)}
        </h1>

        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
          <span aria-hidden>🕐</span>
          <span>
            {formatDateLong(start)}, {formatTimeLong(start)} - {formatTimeLong(end)}
          </span>
        </div>

        {data.program && (
          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
            <span aria-hidden>🏋️</span>
            <span>{data.program}</span>
          </div>
        )}

        {data.location && (
          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
            <span aria-hidden>📍</span>
            <span>{data.location}</span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
          <span aria-hidden>🧑‍🏫</span>
          <span>
            {data.coach ? `Coach: ${data.coach.firstName} ${data.coach.lastName}` : "Coach is currently unassigned"}
          </span>
        </div>

        <Link
          href={`/portal?tab=workout&date=${encodeURIComponent(start.toISOString())}`}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-teal-400 hover:underline"
        >
          Go to workout <span aria-hidden>↗</span>
        </Link>

        {actionError && <p className="mt-4 rounded bg-red-950 px-3 py-2 text-sm text-red-300">{actionError}</p>}

        <div className="mt-6 border-t border-zinc-800" />

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
          <span aria-hidden>👥</span>
          <span>Attendees</span>
          <span className="text-zinc-500">
            {reservedCount} | {data.capacity}
          </span>
        </div>

        <div className="mt-3 flex flex-col">
          {data.attendees.length === 0 && <p className="py-4 text-sm text-zinc-500">No one has reserved yet.</p>}
          {data.attendees.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-b border-zinc-900 py-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
                  a.firstName
                )}`}
              >
                {a.firstName[0]}
                {a.lastName[0]}
              </div>
              <span className="text-sm text-zinc-200">
                {a.firstName} {a.lastName}
              </span>
              {a.status === "Waitlisted" && (
                <span className="ml-auto text-xs font-semibold text-amber-300">WAITLISTED</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950 px-4 py-4">
        {data.myReservation ? (
          <button
            onClick={() => handleCancel(data.myReservation!.id)}
            disabled={submitting}
            className="w-full rounded-full border border-red-500/40 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {data.myReservation.status === "Waitlisted" ? "Leave Waitlist" : "Cancel Reservation"}
          </button>
        ) : (
          <button
            onClick={handleReserve}
            disabled={submitting}
            className="w-full rounded-full bg-teal-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50"
          >
            {submitting ? "Please wait…" : data.spotsRemaining > 0 ? "Reserve" : "Join Waitlist"}
          </button>
        )}
      </div>
    </div>
  );
}
