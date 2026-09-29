import { useQuery } from "@tanstack/react-query";
import { api, type Today } from "./api";
import { addDays, todayStr, weekStartStr } from "./format";

type FollowUpApp = Today["followUps"][number];
type Interview = Today["interviews"][number];
type StaleApp = Today["stale"][number];

export type NeedsYou =
  | { kind: "followup"; key: string; app: FollowUpApp; overdue: boolean }
  | { kind: "interview"; key: string; interview: Interview }
  | { kind: "stale"; key: string; app: StaleApp };

export type ComingUp =
  | { kind: "followup"; key: string; date: string; app: FollowUpApp }
  | { kind: "interview"; key: string; date: string; interview: Interview };

const HORIZON_DAYS = 14;

export function useToday() {
  const today = todayStr();
  const query = useQuery({
    queryKey: ["today", today],
    queryFn: () => api.today(today, weekStartStr()),
    refetchInterval: 5 * 60_000,
  });
  const data = query.data;
  const needsYou: NeedsYou[] = [];
  const comingUp: ComingUp[] = [];

  if (data) {
    const horizon = addDays(today, HORIZON_DAYS);
    for (const i of data.interviews) {
      const d = i.date.slice(0, 10);
      if (d === today) needsYou.push({ kind: "interview", key: `i${i.id}`, interview: i });
      else if (d <= horizon) comingUp.push({ kind: "interview", key: `i${i.id}`, date: d, interview: i });
    }
    for (const a of data.followUps) {
      const d = a.followUpAt!.slice(0, 10);
      if (d <= today) needsYou.push({ kind: "followup", key: `f${a.id}`, app: a, overdue: d < today });
      else if (d <= horizon) comingUp.push({ kind: "followup", key: `f${a.id}`, date: d, app: a });
    }
    for (const a of data.stale) needsYou.push({ kind: "stale", key: `s${a.id}`, app: a });
    comingUp.sort((a, b) => a.date.localeCompare(b.date));
  }

  return { ...query, needsYou, comingUp };
}
