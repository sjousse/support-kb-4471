// The problems #4471 holds. causes.ts tells a flipped date's cause from the tenant; the desk's
// notes (desk-notes.json) list the reports people read as a one-day move, which is no flip at all.
// Each problem is its own ticket in this repo's issues. Counts follow the desk's own view
// (CauseTable): a report counts where causes.ts files it, so the one-day moves stay in their
// tenant's cause and are also listed under their own problem.
import { causeOf, uniqueById, type Report, type Tenant } from './causes.ts';

export type Problem = 'parser' | 'hint' | 'one-day-move' | 'unplaced';

// Where each ticket stands. From engineering's update on #4471 (closed 05 Oct).
export type State = { state: 'open' | 'fixed' | "won't fix"; why: string };

export const PROBLEMS: Record<Problem, { title: string; issue: number | null; what: string } & State> = {
  parser: {
    title: 'Shared parser reads dates month first for day-first tenants',
    issue: 1,
    what: 'A day-first date (7/4 = 7 April) is read as 4 July: day and month swap.',
    state: 'fixed',
    why: 'fix(dates): parse dd/mm for eu locales',
  },
  hint: {
    title: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    issue: 2,
    what: 'People type what the hint says, month first; the form reads it the tenant’s way, day first.',
    state: "won't fix",
    why: 'booking-v3 form retired',
  },
  'one-day-move': {
    title: 'Dates move by one day: not a day/month flip',
    issue: 3,
    what: 'The day is off by one (Tuesday shows as Monday, June bookings a day off, one meeting on two days).',
    state: 'open',
    why: 'not in engineering’s update; the parser fix does not explain a one-day move',
  },
  unplaced: { title: 'No cause found', issue: null, what: 'Tenant not on file or not day-first.', state: 'open', why: '' },
};

export function problemsOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem[] {
  const filed: Problem = causeOf(r, t) ?? 'unplaced';
  return oneDayMove.includes(r.id) ? [filed, 'one-day-move'] : [filed];
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  taggedAs: Record<string, number>;
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; unique: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    for (const p of problemsOf(r, tenantOf(r), oneDayMove)) by.set(p, [...(by.get(p) ?? []), r]);
  }
  const count = (rs: Report[], k: (r: Report) => string) =>
    rs.reduce<Record<string, number>>((n, r) => ({ ...n, [k(r)]: (n[k(r)] ?? 0) + 1 }), {});
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: count(rs, (r) => r.meta.intakeTag),
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: count(rs, (r) => r.channel),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  // How many of a problem's reports are also listed under another problem.
  const alsoIn = (p: Problem) => (p === 'one-day-move' ? 0 : (by.get(p) ?? []).filter((r) => oneDayMove.includes(r.id)).length);
  return { rows: all.filter((r) => r.mergedInto === ticket).length, unique: merged.length, groups, alsoIn };
}
