import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListSoldiers, getListSoldiersQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Minus, X, Trophy, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SoldierFull = {
  id: number;
  name: string;
  rank: string;
  unit: string;
  points: number;
  isCheckedIn: boolean;
  rankIndex: number;
};

function PointsDialog({
  soldier,
  onClose,
  onDone,
}: {
  soldier: SoldierFull;
  onClose: () => void;
  onDone: () => void;
}) {
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const apply = async (sign: 1 | -1) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/soldiers/${soldier.id}/points`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: sign * delta, reason }),
      });
      if (!res.ok) throw new Error();
      toast({ title: sign > 0 ? `تمت إضافة ${delta} نقطة` : `تم خصم ${delta} نقطة` });
      onDone();
      onClose();
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4"
        style={{ background: "rgba(8,18,45,0.98)", border: "1px solid rgba(50,100,200,0.4)" }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            نقاط — {soldier.name}
          </h3>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm" style={{ color: "#7aa8d8" }}>
          النقاط الحالية:{" "}
          <span className="font-black text-yellow-400 text-lg">{soldier.points}</span>
        </p>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "#9bbfdf" }}>
            الكمية
          </label>
          <input
            type="number"
            min={1}
            value={delta}
            onChange={(e) => setDelta(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full h-10 px-3 rounded-lg text-sm"
            style={{
              background: "rgba(15,30,70,0.8)",
              border: "1px solid rgba(60,110,200,0.3)",
              color: "#e0eeff",
            }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "#9bbfdf" }}>
            السبب (اختياري)
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب التعديل..."
            className="w-full h-10 px-3 rounded-lg text-sm"
            style={{
              background: "rgba(15,30,70,0.8)",
              border: "1px solid rgba(60,110,200,0.3)",
              color: "#e0eeff",
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => apply(1)}
            disabled={loading}
            className="h-10 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-colors"
            style={{
              background: "rgba(16,185,129,0.2)",
              border: "1px solid rgba(16,185,129,0.4)",
              color: "#34d399",
            }}
          >
            <Plus className="w-4 h-4" /> إضافة
          </button>
          <button
            onClick={() => apply(-1)}
            disabled={loading}
            className="h-10 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-colors"
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#f87171",
            }}
          >
            <Minus className="w-4 h-4" /> خصم
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Points() {
  const { user } = useAuth();
  const { data: soldiers, isLoading } = useListSoldiers();
  const queryClient = useQueryClient();
  const [selectedSoldier, setSelectedSoldier] = useState<SoldierFull | null>(null);
  const isAdmin = user?.role === "admin";

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });

  const sorted = [...((soldiers as SoldierFull[]) || [])].sort(
    (a, b) => b.points - a.points
  );

  const top3 = sorted.slice(0, 3);

  return (
    <AppLayout>
      {selectedSoldier && isAdmin && (
        <PointsDialog
          soldier={selectedSoldier}
          onClose={() => setSelectedSoldier(null)}
          onDone={refresh}
        />
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        <div>
          <h2
            className="text-2xl md:text-3xl font-black tracking-tight uppercase flex items-center gap-3"
            style={{ color: "#fbbf24" }}
          >
            <Star className="w-7 h-7" />
            نظام النقاط
          </h2>
          <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
            {isAdmin ? "إدارة نقاط الأفراد — خاص بالقيادة" : "ترتيب الأفراد حسب النقاط"}
          </p>
        </div>

        {/* Top 3 podium */}
        {!isLoading && top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { rank: 1, color: "#fbbf24", icon: "🥇" },
              { rank: 2, color: "#94a3b8", icon: "🥈" },
              { rank: 3, color: "#b45309", icon: "🥉" },
            ].map(({ rank, color, icon }) => {
              const s = sorted[rank - 1];
              if (!s) return null;
              return (
                <div
                  key={rank}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}40`,
                  }}
                >
                  <div className="text-2xl mb-1">{icon}</div>
                  <p
                    className="font-black text-sm truncate"
                    style={{ color }}
                  >
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.rank}</p>
                  <p
                    className="font-black text-xl mt-2"
                    style={{ color }}
                  >
                    {s.points}
                  </p>
                  <p className="text-xs text-muted-foreground">نقطة</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <Card
          className="border-border bg-card/50 backdrop-blur"
          style={{ borderColor: "rgba(251,191,36,0.25)" }}
        >
          <CardHeader className="pb-3">
            <CardTitle
              className="flex items-center gap-2 text-base md:text-lg"
              style={{ color: "#fbbf24" }}
            >
              <Trophy className="w-5 h-5" />
              ترتيب النقاط
              {isAdmin && (
                <span className="mr-auto text-xs font-normal" style={{ color: "#7aa8d8" }}>
                  اضغط على فرد لتعديل نقاطه
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                <span className="w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin ml-2" />
                جاري التحميل...
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden divide-y divide-border/30">
                  {sorted.map((soldier, i) => (
                    <div
                      key={soldier.id}
                      onClick={() => isAdmin && setSelectedSoldier(soldier)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors text-right ${isAdmin ? "cursor-pointer hover:bg-white/5" : ""}`}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{
                          background:
                            i === 0
                              ? "rgba(251,191,36,0.2)"
                              : i === 1
                              ? "rgba(148,163,184,0.2)"
                              : i === 2
                              ? "rgba(180,87,9,0.2)"
                              : "rgba(30,60,120,0.3)",
                          color:
                            i === 0
                              ? "#fbbf24"
                              : i === 1
                              ? "#94a3b8"
                              : i === 2
                              ? "#b45309"
                              : "#7aa8d8",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-bold text-sm text-white">{soldier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {soldier.rank} — {soldier.unit}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="font-black text-lg" style={{ color: "#fbbf24" }}>
                          {soldier.points}
                        </span>
                        <Star className="w-4 h-4 text-yellow-400" />
                      </div>
                    </div>
                  ))}
                  {sorted.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      لا يوجد أفراد
                    </p>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(251,191,36,0.2)" }}>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase w-12"
                          style={{ color: "#fbbf24" }}
                        >
                          #
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#7dd3fc" }}
                        >
                          الاسم
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#c4b5fd" }}
                        >
                          الرتبة
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#86efac" }}
                        >
                          الوحدة
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#fbbf24" }}
                        >
                          النقاط
                        </th>
                        {isAdmin && (
                          <th
                            className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                            style={{ color: "#94a3b8" }}
                          >
                            إجراء
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((soldier, i) => (
                        <tr
                          key={soldier.id}
                          className="transition-colors hover:bg-white/5"
                          style={{ borderBottom: "1px solid rgba(50,100,200,0.12)" }}
                        >
                          <td className="p-4 align-middle">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                              style={{
                                background:
                                  i === 0
                                    ? "rgba(251,191,36,0.2)"
                                    : i === 1
                                    ? "rgba(148,163,184,0.2)"
                                    : i === 2
                                    ? "rgba(180,87,9,0.2)"
                                    : "rgba(30,60,120,0.3)",
                                color:
                                  i === 0
                                    ? "#fbbf24"
                                    : i === 1
                                    ? "#94a3b8"
                                    : i === 2
                                    ? "#b45309"
                                    : "#7aa8d8",
                              }}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td
                            className="p-4 align-middle font-bold"
                            style={{ color: "#e0eeff" }}
                          >
                            {soldier.name}
                          </td>
                          <td
                            className="p-4 align-middle text-xs font-semibold"
                            style={{ color: "#c4b5fd" }}
                          >
                            {soldier.rank}
                          </td>
                          <td
                            className="p-4 align-middle text-xs"
                            style={{ color: "#86efac" }}
                          >
                            {soldier.unit}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-black text-xl"
                                style={{ color: "#fbbf24" }}
                              >
                                {soldier.points}
                              </span>
                              <Star className="w-4 h-4 text-yellow-400" />
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="p-4 align-middle">
                              <button
                                onClick={() => setSelectedSoldier(soldier)}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1"
                                style={{
                                  background: "rgba(251,191,36,0.15)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(251,191,36,0.3)",
                                }}
                              >
                                <TrendingUp className="w-3 h-3" />
                                تعديل
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {sorted.length === 0 && (
                        <tr>
                          <td
                            colSpan={isAdmin ? 6 : 5}
                            className="h-24 text-center text-muted-foreground"
                          >
                            لا يوجد أفراد
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
