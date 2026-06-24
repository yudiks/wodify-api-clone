"use client";

import { useEffect, useState } from "react";
import { addDays, formatDateLong, portalApi as api } from "@/lib/portal-format";

interface ResultRow {
  id: number;
  notes: string;
  score?: number | null;
  performedAt: string;
}

interface ExerciseRow {
  id: number;
  name: string;
  prescription: string | null;
  videoUrl: string | null;
  scored?: boolean;
  unit?: string | null;
  sortDirection?: string;
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

interface ExerciseLeaderboardEntry {
  rank: number;
  clientName: string;
  bestScore: number;
}

interface ExerciseBreakdown {
  workoutExerciseId: string;
  exerciseName: string;
  unit: string | null;
  sortDirection: string;
  leaderboard: ExerciseLeaderboardEntry[];
}

interface CombinedLeaderboardEntry {
  rank: number;
  clientName: string;
  totalPoints: number;
}

interface WorkoutLeaderboard {
  workoutId: string;
  workoutName: string;
  combinedLeaderboard: CombinedLeaderboardEntry[];
  exerciseBreakdown: ExerciseBreakdown[];
}

function medalClass(rank: number): string {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-amber-600";
  return "text-zinc-400";
}

function ExerciseCard({ exercise, workoutId }: { exercise: ExerciseRow; workoutId: number }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ResultRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [exerciseLeaderboard, setExerciseLeaderboard] = useState<ExerciseBreakdown | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

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
    const trimmedScore = score.trim();
    const { ok, status, body } = await api<{ error?: string }>(
      `/api/v1/portal/workouts/exercises/${exercise.id}/results`,
      {
        method: "POST",
        body: JSON.stringify({
          notes,
          ...(trimmedScore ? { score: parseFloat(trimmedScore) } : {}),
        }),
      }
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
    setScore("");
    setEditing(false);
    const refreshed = await api<{ data: ResultRow[] }>(`/api/v1/portal/workouts/exercises/${exercise.id}/results`);
    setHistory(refreshed.body.data);
    setHistoryOpen(true);
  }

  async function toggleLeaderboard() {
    if (leaderboardOpen) {
      setLeaderboardOpen(false);
      return;
    }
    setLeaderboardOpen(true);
    setLeaderboardLoading(true);
    const { ok, body } = await api<WorkoutLeaderboard>(`/api/v1/portal/workouts/${workoutId}/leaderboard`);
    setLeaderboardLoading(false);
    if (!ok) {
      setExerciseLeaderboard(null);
      return;
    }
    const match = body.exerciseBreakdown.find((e) => e.workoutExerciseId === String(exercise.id));
    setExerciseLeaderboard(match ?? null);
  }

  return (
    <div className="mb-3 rounded-lg border border-teal-900/60 bg-zinc-900/60 p-3">
      {exercise.prescription && <p className="mb-2 text-sm text-zinc-300">{exercise.prescription}</p>}

      <div className="flex items-center gap-3">
        <button onClick={toggleHistory} className="text-xs font-medium text-teal-400 hover:underline">
          View history
        </button>
        {exercise.scored && (
          <button onClick={toggleLeaderboard} className="text-xs font-medium text-teal-400 hover:underline">
            Leaderboard
          </button>
        )}
      </div>

      {historyOpen && (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          {history && history.length === 0 && <p className="text-xs text-zinc-500">No history yet.</p>}
          {history?.map((r) => (
            <div key={r.id} className="py-1 text-xs text-zinc-400">
              <span className="text-zinc-500">{new Date(r.performedAt).toLocaleDateString()}: </span>
              {r.notes}
              {r.score != null && <span className="text-teal-400"> ({r.score}{exercise.unit ? ` ${exercise.unit}` : ""})</span>}
            </div>
          ))}
        </div>
      )}

      {leaderboardOpen && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
          {leaderboardLoading && <p className="text-xs text-zinc-500">Loading…</p>}
          {!leaderboardLoading && !exerciseLeaderboard && (
            <p className="text-xs text-zinc-500">No leaderboard data yet.</p>
          )}
          {!leaderboardLoading && exerciseLeaderboard && (
            <ul className="space-y-1">
              {exerciseLeaderboard.leaderboard.map((entry) => (
                <li key={entry.rank} className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${medalClass(entry.rank)}`}>
                    #{entry.rank} {entry.clientName}
                  </span>
                  <span className="text-zinc-300">
                    {entry.bestScore}
                    {exerciseLeaderboard.unit ? ` ${exerciseLeaderboard.unit}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
          {exercise.scored && (
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Score{exercise.unit ? ` (${exercise.unit})` : ""}
              <input
                type="number"
                step="any"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none"
              />
            </label>
          )}
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
  const [leaderboardWorkoutId, setLeaderboardWorkoutId] = useState<number | null>(null);
  const [workoutLeaderboard, setWorkoutLeaderboard] = useState<WorkoutLeaderboard | null>(null);
  const [workoutLeaderboardLoading, setWorkoutLeaderboardLoading] = useState(false);

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

  async function toggleWorkoutLeaderboard(workoutId: number) {
    if (leaderboardWorkoutId === workoutId) {
      setLeaderboardWorkoutId(null);
      return;
    }
    setLeaderboardWorkoutId(workoutId);
    setWorkoutLeaderboard(null);
    setWorkoutLeaderboardLoading(true);
    const { ok, body } = await api<WorkoutLeaderboard>(`/api/v1/portal/workouts/${workoutId}/leaderboard`);
    setWorkoutLeaderboardLoading(false);
    setWorkoutLeaderboard(ok ? body : null);
  }

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

        {workouts?.map((w) => {
          const hasScoredExercise = w.sections.some((s) => s.exercises.some((e) => e.scored));
          return (
          <div key={w.id} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {w.program ?? w.name} - {formatDateLong(date)}
              </h2>
              {hasScoredExercise && (
                <button
                  onClick={() => toggleWorkoutLeaderboard(w.id)}
                  className="rounded-full border border-teal-400 px-3 py-1 text-xs font-semibold text-teal-400 transition hover:bg-teal-500/10"
                >
                  View Leaderboard
                </button>
              )}
            </div>

            {leaderboardWorkoutId === w.id && (
              <div className="mb-4 rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                {workoutLeaderboardLoading && <p className="text-xs text-zinc-500">Loading…</p>}
                {!workoutLeaderboardLoading && !workoutLeaderboard && (
                  <p className="text-xs text-zinc-500">No leaderboard data yet.</p>
                )}
                {!workoutLeaderboardLoading && workoutLeaderboard && (
                  <>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Combined Ranking
                    </h4>
                    <ul className="mb-4 space-y-1">
                      {workoutLeaderboard.combinedLeaderboard.map((entry) => (
                        <li key={entry.rank} className="flex items-center justify-between text-xs">
                          <span className={`font-semibold ${medalClass(entry.rank)}`}>
                            #{entry.rank} {entry.clientName}
                          </span>
                          <span className="text-zinc-300">{entry.totalPoints} pts</span>
                        </li>
                      ))}
                    </ul>

                    {workoutLeaderboard.exerciseBreakdown.map((eb) => (
                      <div key={eb.workoutExerciseId} className="mb-3">
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {eb.exerciseName}
                        </h4>
                        <ul className="space-y-1">
                          {eb.leaderboard.map((entry) => (
                            <li key={entry.rank} className="flex items-center justify-between text-xs">
                              <span className={`font-semibold ${medalClass(entry.rank)}`}>
                                #{entry.rank} {entry.clientName}
                              </span>
                              <span className="text-zinc-300">
                                {entry.bestScore}
                                {eb.unit ? ` ${eb.unit}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

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
                    <ExerciseCard key={exercise.id} exercise={exercise} workoutId={w.id} />
                  )
                )}
              </div>
            ))}
          </div>
          );
        })}
      </div>
    </div>
  );
}
