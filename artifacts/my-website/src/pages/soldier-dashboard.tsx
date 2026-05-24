import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useCheckIn,
  useCheckOut,
  useListSoldiers,
  getGetMyProfileQueryKey,
  getListSoldiersQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserMinus, AlertTriangle, Clock, Shield, Users, Star, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} دقيقة`;
  if (m === 0) return `${h} ساعة`;
  return `${h}س ${m}د`;
}

const BUSY_OPTIONS = ["تحقيق", "ايصال سجين", "اصطفاف عسكري", "اغراض شخصية"] as const;
const BUSY_COLORS: Record<string, string> = {
  "تحقيق": "#f59e0b",
  "ايصال سجين": "#8b5cf6",
  "اصطفاف عسكري": "#3b82f6",
  "اغراض شخصية": "#6b7280",
};

type SoldierFull = {
  id: number;
  name: string;
  rank: string;
  unit: string;
  isCheckedIn: boolean;
  busyStatus: string | null;
  points: number;
  totalMinutes: number;
  todayMinutes: number;
  warningsCount: number;
  lastCheckIn: string | null;
};

// ── Busy options popup ────────────────────────────────────────────────────────
function BusyMenu({ soldierId, current, onDone, onClose }: {
  soldierId: number;
  current: string | null;
  onDone: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const apply = async (status: string | null) => {
    setLoading(status ?? "resume");
    try {
      const res = await fetch(`${BASE}/api/soldiers/${soldierId}/busy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast({ title: status ? `تم تعيينك كـ "${status}"` : "تم الرجوع من المشغول" });
      onDone();
      onClose();
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="rounded-2xl p-5 w-full max-w-xs space-y-3"
        style={{ background: "rgba(7,15,40,0.98)", border: "1px solid rgba(50,100,200,0.4)" }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">حدد سبب الانشغال</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-2">
          {BUSY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => apply(opt)}
              disabled={loading !== null}
              className="w-full h-11 px-4 rounded-xl text-sm font-bold text-right transition-all"
              style={{
                background: current === opt ? `${BUSY_COLORS[opt]}33` : "rgba(20,40,90,0.6)",
                border: `1px solid ${current === opt ? BUSY_COLORS[opt] : "rgba(60,110,200,0.25)"}`,
                color: BUSY_COLORS[opt],
                opacity: loading !== null && loading !== opt ? 0.5 : 1,
              }}
            >
              {loading === opt ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  جاري...
                </span>
              ) : opt}
            </button>
          ))}
        </div>

        {current && (
          <button
            onClick={() => apply(null)}
            disabled={loading !== null}
            className="w-full h-10 rounded-xl text-sm font-bold transition-all"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399" }}
          >
            {loading === "resume" ? "جاري..." : "رجوع (إنهاء الانشغال)"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SoldierDashboard() {
  const { data: profile, isLoading } = useGetMyProfile();
  const { data: allSoldiers, isLoading: soldiersLoading } = useListSoldiers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busyMenuOpen, setBusyMenuOpen] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });
  };

  const checkInMutation = useCheckIn({
    mutation: {
      onSuccess: () => { refresh(); toast({ title: "تم تسجيل الدخول بنجاح" }); },
      onError: (err: any) => { toast({ title: "خطأ", description: err.error, variant: "destructive" }); }
    }
  });

  const checkOutMutation = useCheckOut({
    mutation: {
      onSuccess: () => { refresh(); toast({ title: "تم تسجيل الخروج بنجاح" }); },
      onError: (err: any) => { toast({ title: "خطأ", description: err.error, variant: "destructive" }); }
    }
  });

  if (isLoading || !profile) {
    return (
      <AppLayout>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-2" />
          جاري تحميل بياناتك...
        </div>
      </AppLayout>
    );
  }

  const profileFull = profile as any;
  const busyStatus = profileFull.busyStatus ?? null;

  return (
    <AppLayout>
      {busyMenuOpen && (
        <BusyMenu
          soldierId={profile.id}
          current={busyStatus}
          onDone={refresh}
          onClose={() => setBusyMenuOpen(false)}
        />
      )}

      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto" dir="rtl">

        {/* Profile card */}
        <div className="p-5 md:p-7 rounded-xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(10,22,55,0.95) 0%, rgba(8,15,40,0.95) 100%)",
            border: "1px solid rgba(50,100,200,0.35)",
            boxShadow: "0 0 40px rgba(20,60,180,0.2)",
          }}>
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(30,80,200,0.15) 0%, transparent 70%)" }} />

          <div className="flex items-center gap-4 md:gap-6 relative z-10">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 shrink-0"
              style={{ background: "rgba(20,50,120,0.5)", borderColor: "rgba(80,140,255,0.5)" }}>
              <Shield className="w-7 h-7 md:w-10 md:h-10" style={{ color: "#4da6ff" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-3xl font-black tracking-tight text-white truncate">{profile.name}</h2>
              <p className="text-sm md:text-base font-medium mt-0.5" style={{ color: "#7aa8d8" }}>
                {profile.rank} — {profile.unit}
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="mt-4 relative z-10 flex flex-wrap gap-2">
            <Badge className={`px-3 py-1.5 text-sm font-bold border ${profile.isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}`}>
              <div className={`w-2 h-2 rounded-full ml-2 ${profile.isCheckedIn ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {profile.isCheckedIn ? "مداوم (حاضر)" : "غير مداوم (غائب)"}
            </Badge>
            {busyStatus && (
              <Badge className="px-3 py-1.5 text-sm font-bold" style={{
                background: `${BUSY_COLORS[busyStatus] || "#6b7280"}22`,
                color: BUSY_COLORS[busyStatus] || "#9ca3af",
                borderColor: `${BUSY_COLORS[busyStatus] || "#6b7280"}55`,
              }}>
                مشغول — {busyStatus}
              </Badge>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 relative z-10">
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(10,20,55,0.6)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <p className="text-xs" style={{ color: "rgba(150,170,200,0.8)" }}>النقاط</p>
              <p className="font-black text-lg" style={{ color: "#fbbf24" }}>{profileFull.points ?? 0}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(10,20,55,0.6)", border: "1px solid rgba(125,211,252,0.2)" }}>
              <p className="text-xs" style={{ color: "rgba(150,170,200,0.8)" }}>وقت اليوم</p>
              <p className="font-black text-base" style={{ color: "#7dd3fc" }}>{formatMinutes(profileFull.todayMinutes ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Check-in / out / busy buttons */}
        <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: "#7dd3fc" }}>
              <Clock className="w-5 h-5" />
              تسجيل الحضور والانصراف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 3-button row */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <Button
                size="lg"
                className="font-bold h-14 md:h-16 text-sm md:text-base"
                onClick={() => { if (profile?.id) checkInMutation.mutate({ id: profile.id }); }}
                disabled={profile.isCheckedIn || checkInMutation.isPending}
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff" }}
              >
                <UserCheck className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                {checkInMutation.isPending ? "..." : "دخول"}
              </Button>

              {/* Busy button */}
              <button
                onClick={() => { if (profile.isCheckedIn) setBusyMenuOpen(true); }}
                disabled={!profile.isCheckedIn}
                className="font-bold h-14 md:h-16 text-sm md:text-base rounded-md flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
                style={{
                  background: busyStatus ? `${BUSY_COLORS[busyStatus] || "#f59e0b"}33` : "rgba(245,158,11,0.15)",
                  border: `2px solid ${busyStatus ? (BUSY_COLORS[busyStatus] || "#f59e0b") : "rgba(245,158,11,0.4)"}`,
                  color: busyStatus ? (BUSY_COLORS[busyStatus] || "#f59e0b") : "#f59e0b",
                }}
              >
                <ChevronDown className="w-4 h-4" />
                <span>{busyStatus ? busyStatus : "مشغول"}</span>
              </button>

              <Button
                size="lg"
                variant="destructive"
                className="font-bold h-14 md:h-16 text-sm md:text-base"
                onClick={() => { if (profile?.id) checkOutMutation.mutate({ id: profile.id }); }}
                disabled={!profile.isCheckedIn || checkOutMutation.isPending}
              >
                <UserMinus className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                {checkOutMutation.isPending ? "..." : "خروج"}
              </Button>
            </div>

            {/* Total time */}
            <div className="p-4 rounded-lg flex items-center justify-between"
              style={{ background: "rgba(10,20,50,0.6)", border: "1px solid rgba(50,100,200,0.2)" }}>
              <span className="font-semibold text-sm" style={{ color: "#7aa8d8" }}>إجمالي ساعات العمل:</span>
              <span className="text-lg font-black font-mono" style={{ color: "#4da6ff" }}>
                {formatMinutes(profile.totalMinutes ?? (profileFull.totalMinutes ?? 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Soldiers table */}
        <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: "#86efac" }}>
              <Users className="w-5 h-5" />
              جدول العساكر
              <div className="mr-auto flex items-center gap-2">
                <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                  {(allSoldiers as SoldierFull[])?.filter(s => s.isCheckedIn).length ?? 0} مداوم
                </Badge>
                <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/50">
                  {(allSoldiers as SoldierFull[])?.filter(s => !s.isCheckedIn).length ?? 0} غائب
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {soldiersLoading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                <span className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-2" />
                جاري التحميل...
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden divide-y" style={{ borderColor: "rgba(50,100,200,0.15)" }}>
                  {(allSoldiers as SoldierFull[])?.map(soldier => (
                    <div key={soldier.id} className="px-4 py-3 space-y-1"
                      style={{ background: soldier.id === profile.id ? "rgba(212,175,55,0.05)" : undefined }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm" style={{ color: soldier.id === profile.id ? "#fbbf24" : "#e0eeff" }}>
                          {soldier.name} {soldier.id === profile.id && <span className="text-xs text-yellow-400/60">(أنت)</span>}
                        </p>
                        <div className="flex gap-1">
                          <Badge className={`text-xs ${soldier.isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}`}>
                            {soldier.isCheckedIn ? "مداوم" : "غائب"}
                          </Badge>
                          {soldier.busyStatus && (
                            <Badge className="text-xs" style={{ background: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}22`, color: BUSY_COLORS[soldier.busyStatus], borderColor: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}55` }}>
                              {soldier.busyStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs" style={{ color: "#7aa8d8" }}>
                        <span>{soldier.rank}</span>
                        <span><Clock className="w-3 h-3 inline ml-0.5" />{formatMinutes(soldier.todayMinutes)} اليوم</span>
                        <span><Star className="w-3 h-3 inline ml-0.5 text-yellow-400" />{soldier.points} ن</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(50,100,200,0.2)" }}>
                        <th className="h-11 px-4 text-right align-middle font-bold text-xs uppercase" style={{ color: "#7dd3fc" }}>الاسم</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-xs uppercase" style={{ color: "#c4b5fd" }}>الرتبة</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-xs uppercase" style={{ color: "#fbbf24" }}>الحالة</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-xs uppercase" style={{ color: "#7dd3fc" }}>وقت اليوم</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-xs uppercase" style={{ color: "#86efac" }}>إجمالي</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-xs uppercase" style={{ color: "#fbbf24" }}>النقاط</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-xs uppercase" style={{ color: "#fb923c" }}>التحذيرات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(allSoldiers as SoldierFull[])?.map(soldier => (
                        <tr key={soldier.id} className="transition-colors hover:bg-white/5"
                          style={{
                            borderBottom: "1px solid rgba(50,100,200,0.12)",
                            background: soldier.id === profile.id ? "rgba(212,175,55,0.04)" : undefined,
                          }}>
                          <td className="p-4 align-middle font-bold" style={{ color: soldier.id === profile.id ? "#fbbf24" : "#e0eeff" }}>
                            {soldier.name}
                            {soldier.id === profile.id && <span className="text-xs text-yellow-400/60 mr-1">(أنت)</span>}
                          </td>
                          <td className="p-4 align-middle text-xs font-semibold" style={{ color: "#c4b5fd" }}>{soldier.rank}</td>
                          <td className="p-4 align-middle">
                            <div className="flex flex-col gap-1">
                              <Badge className={`text-xs w-fit ${soldier.isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}`}>
                                {soldier.isCheckedIn ? "مداوم ✓" : "غائب ✗"}
                              </Badge>
                              {soldier.busyStatus && (
                                <Badge className="text-xs w-fit" style={{ background: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}22`, color: BUSY_COLORS[soldier.busyStatus], borderColor: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}55` }}>
                                  {soldier.busyStatus}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 align-middle font-mono text-xs" style={{ color: "#7dd3fc" }}>{formatMinutes(soldier.todayMinutes)}</td>
                          <td className="p-4 align-middle font-mono text-xs" style={{ color: "#86efac" }}>{formatMinutes(soldier.totalMinutes)}</td>
                          <td className="p-4 align-middle font-black text-sm" style={{ color: "#fbbf24" }}>{soldier.points}</td>
                          <td className="p-4 align-middle">
                            {soldier.warningsCount > 0 ? (
                              <Badge variant="outline" style={{ color: "#fb923c", borderColor: "rgba(251,146,60,0.4)", background: "rgba(251,146,60,0.1)" }}>
                                <AlertTriangle className="w-3 h-3 ml-1" />{soldier.warningsCount}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card className="border-border bg-card/50 backdrop-blur"
          style={{ borderColor: profile.warningsCount > 0 ? "rgba(251,146,60,0.4)" : "rgba(50,100,200,0.3)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg"
              style={{ color: profile.warningsCount > 0 ? "#fb923c" : "#fbbf24" }}>
              <AlertTriangle className="w-5 h-5" />
              سجل التحذيرات
              {profile.warningsCount > 0 && (
                <Badge variant="outline" className="mr-auto text-xs" style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c", borderColor: "rgba(251,146,60,0.4)" }}>
                  {profile.warningsCount} تحذير
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.warnings.length === 0 ? (
              <div className="text-center p-6 rounded-lg font-bold flex flex-col items-center gap-2"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>
                <Shield className="w-7 h-7" />
                <span className="text-sm">سجلك خالي من التحذيرات. استمر في الانضباط!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.warnings.map((warning: any) => (
                  <div key={warning.id} className="p-3 md:p-4 rounded-lg"
                    style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)" }}>
                    <p className="font-bold text-sm" style={{ color: "#fb923c" }}>{warning.reason}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>صادر من: {warning.givenBy}</span>
                      <span className="font-mono">{format(new Date(warning.createdAt), "yyyy/MM/dd")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
