"use client";

import { useEffect, useState } from "react";
import { addDays, formatDateLong, portalApi as api } from "@/lib/portal-format";

interface ResultRow {
  id: number;
  notes: string;
  performedAt: string;
}

interface ExerciseRow {
  id: number;
  name: string;
  prescription: string | null;
  videoUrl: string | null;
}

interface SectionRow {
  id: number;
  title: string;
  notes: string | null;
  exercises: ExerciseRow[];
}

interface WorkoutRow {
  id: number;
  name: string;
  program: string | null;
  scheduledDate: string | null;
  sections: SectionRow[];
}

function ExerciseCard({ exercise }: { exercise: ExerciseRow }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ResultRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleHistory() {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    const { ok, status, body } = await api<{ data: ResultRow[] }>(
      `/api/v1/portal/workouts/exercises/${exercise.id}/results`
    );
    if (status === 401) {
      setError("Sign in to view your history.");
      return;
    }
    setHistory(ok ? body.data : []);
    setHistoryOpen(true);
  }

  async function submitResult(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) return;
    setSubmitting(true);
    setError(null);
    const { ok, status, body } = await api<{ error?: string }>(
      `/api/v1/portal/workouts/exercises/${exercise.id}/results`,
      { method: "POST", body: JSON.stringify({ notes }) }
    );
    setSubmitting(false);
    if (status === 401) {
      setError("Sign in to log results.");
      return;
    }
    if (!ok) {
      setError(body.error ?? "Could not save result");
      return;
    }
    setNotes("");
    setEditing(false);
    const refreshed = await api<{ data: ResultRow[] }>(`/api/v1/portal/workouts/exercises/${exercise.id}/results`);
    setHistory(refreshed.body.data);
    setHistoryOpen(true);
  }

  return (
    <div className="mb-3 rounded-lg border border-teal-900/60 bg-zinc-900/60 p-3">
      {exercise.prescription && <p className="mb-2 text-sm text-zinc-300">{exercise.prescription}</p>}

      <button onClick={toggleHistory} className="text-xs font-medium text-teal-400 hover:underline">
        View history
      </button>

      {historyOpen && (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          {history && history.length === 0 && <p className="text-xs text-zinc-500">No history yet.</p>}
          {history?.map((r) => (
            <div key={r.id} className="py-1 text-xs text-zinc-400">
              <span className="text-zinc-500">{new Date(r.performedAt).toLocaleDateString()}: </span>
              {r.notes}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-2">
          {exercise.videoUrl ? (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-teal-400 text-teal-400"
              aria-label="Watch demo"
            >
              ▶
            </a>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-zinc-600">
              ▶
            </span>
          )}
          <span className="text-sm text-teal-400">{exercise.name}</span>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {editing ? (
        <form onSubmit={submitResult} className="mt-3 flex flex-col gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 185lb x1, 195lb x1, 205lb x1"
            rows={2}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-full bg-teal-500 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Result"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-zinc-700 px-4 text-sm text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 w-full rounded-full border border-teal-400 py-2 text-sm font-semibold text-teal-400 transition hover:bg-teal-500/10"
        >
          Edit Results
        </button>
      )}
    </div>
  );
}

export default function WorkoutView({ initialDate }: { initialDate?: Date }) {
  const [program, setProgram] = useState<string>("");
  const [programs, setPrograms] = useState<string[]>([]);
  const [date, setDate] = useState(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [workouts, setWorkouts] = useState<WorkoutRow[] | null>(null);

  async function load() {
    const params = new URLSearchParams({ date: date.toISOString() });
    if (program) params.set("program", program);
    const { body } = await api<{ data: WorkoutRow[]; programs: string[] }>(
      `/api/v1/portal/workouts?${params.toString()}`
    );
    setWorkouts(body.data ?? []);
    setPrograms(body.programs ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, program]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 text-sm">
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="rounded bg-transparent text-teal-400 focus:outline-none"
        >
          <option value="" className="bg-zinc-900">
            All Programs
          </option>
          {programs.map((p) => (
            <option key={p} value={p} className="bg-zinc-900">
              {p}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button onClick={() => setDate((d) => addDays(d, -1))} className="text-zinc-500 hover:text-zinc-300">
            ‹
          </button>
          <span className="text-teal-400">{formatDateLong(date)}</span>
          <button onClick={() => setDate((d) => addDays(d, 1))} className="text-zinc-500 hover:text-zinc-300">
            ›
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        {workouts === null && <p className="text-sm text-zinc-500">Loading…</p>}

        {workouts !== null && workouts.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">No workout scheduled for this day.</p>
        )}

        {workouts?.map((w) => (
          <div key={w.id} className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-white">
              {w.program ?? w.name} - {formatDateLong(date)}
            </h2>

            {w.sections.map((section) => (
              <div key={section.id} className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{section.title}</h3>
                {section.notes && <p className="mb-2 text-sm font-medium text-zinc-300">{section.notes}</p>}

                {section.exercises.map((exercise) =>
                  exercise.prescription && exercise.prescription.length < 60 && !exercise.videoUrl ? (
                    <p key={exercise.id} className="py-0.5 text-sm text-zinc-200">
                      {exercise.prescription}{" "}
                      <span className="text-teal-400">{exercise.name}</span>
                    </p>
                  ) : (
                    <ExerciseCard key={exercise.id} exercise={exercise} />
                  )
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
