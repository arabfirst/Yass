import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListSoldiers, useDeleteSoldier, getListSoldiersQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Trash2, AlertTriangle, Clock, X, Shield, ChevronDown, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h}س ${m}د`;
}

const RANKS = [
  "Cadet", "Officer 1", "Officer 2", "Officer 3",
  "Sergeant 1", "Sergeant 2", "Sergeant 3",
  "Lieutenant", "First Lieutenant", "Captain", "Major",
  "Lieutenant Colonel", "Colonel", "Brigadier General",
  "Major General", "Lieutenant General", "General",
  "Deputy Commander", "High Commander", "Chief of Marshal", "Police Chief",
  "Minister of Interior",
];

type SoldierFull = {
  id: number;
  name: string;
  rank: string;
  rankIndex: number;
  unit: string;
  age: number;
  username?: string | null;
  robloxUsername?: string | null;
  isCheckedIn: boolean;
  busyStatus: string | null;
  points: number;
  totalMinutes: number;
  todayMinutes: number;
  warningsCount: number;
  warnings: { id: number; reason: string; givenBy: string; createdAt: string }[];
  lastCheckIn: string | null;
  lastCheckOut: string | null;
};

// ── Edit Soldier Dialog ────────────────────────────────────────────────────────
function EditSoldierDialog({
  soldier,
  onClose,
  onDone,
}: {
  soldier: SoldierFull;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(soldier.name);
  const [rank, setRank] = useState(soldier.rank);
  const [unit, setUnit] = useState(soldier.unit);
  const [age, setAge] = useState(String(soldier.age));
  const [username, setUsername] = useState(soldier.username || "");
  const [password, setPassword] = useState("");
  const [robloxUsername, setRobloxUsername] = useState(soldier.robloxUsername || "");
  const [rankOpen, setRankOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim() || !rank || !unit.trim()) {
      toast({ title: "يرجى تعبئة الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        rank,
        unit: unit.trim(),
        age: parseInt(age) || soldier.age,
        robloxUsername: robloxUsername.trim() || null,
      };
      if (username.trim()) body.username = username.trim();
      if (password.trim()) body.password = password.trim();

      const res = await fetch(`${BASE}/api/soldiers/${soldier.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم تحديث البيانات بنجاح" });
      onDone();
      onClose();
    } catch {
      toast({ title: "خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-md overflow-hidden"
        style={{ background: "rgba(7,15,40,0.98)", border: "1px solid rgba(50,100,200,0.4)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-5 flex items-center gap-3 relative"
          style={{ background: "linear-gradient(135deg, rgba(15,40,100,0.8) 0%, rgba(8,18,50,0.8) 100%)", borderBottom: "1px solid rgba(50,100,200,0.25)" }}>
          <Pencil className="w-5 h-5" style={{ color: "#4da6ff" }} />
          <h2 className="text-lg font-black text-white">تعديل بيانات {soldier.name}</h2>
          <button onClick={onClose} className="absolute top-4 left-4">
            <X className="w-5 h-5 text-muted-foreground hover:text-white transition-colors" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label style={{ color: "#9bbfdf" }}>الاسم الكامل</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-11"
              style={{ background: "rgba(10,20,50,0.8)", border: "1px solid rgba(60,110,200,0.3)", color: "#e0eeff" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label style={{ color: "#c4b5fd" }}>الرتبة</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRankOpen(v => !v)}
                  className="w-full h-11 px-3 rounded-md text-sm text-right flex items-center justify-between"
                  style={{ background: "rgba(10,20,50,0.8)", border: "1px solid rgba(60,110,200,0.3)", color: rank ? "#e0eeff" : "rgba(150,170,200,0.6)" }}
                >
                  <span className="truncate text-xs">{rank || "اختر الرتبة..."}</span>
                  <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#7aa8d8" }} />
                </button>
                {rankOpen && (
                  <div
                    className="absolute z-50 w-full mt-1 rounded-md overflow-auto max-h-56"
                    style={{ background: "rgba(8,18,45,0.98)", border: "1px solid rgba(60,110,200,0.35)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                  >
                    {RANKS.map((r, i) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRank(r); setRankOpen(false); }}
                        className="w-full px-3 py-2 text-xs text-right flex items-center gap-2 hover:bg-white/10 transition-colors"
                        style={{ color: r === rank ? "#4da6ff" : "#c8deff" }}
                      >
                        <span className="text-xs w-5 shrink-0" style={{ color: "rgba(150,170,200,0.5)" }}>{i + 1}</span>
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "#86efac" }}>الوحدة</Label>
              <Input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="h-11"
                style={{ background: "rgba(10,20,50,0.8)", border: "1px solid rgba(60,110,200,0.3)", color: "#e0eeff" }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "#fbbf24" }}>العمر</Label>
            <Input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="h-11"
              style={{ background: "rgba(10,20,50,0.8)", border: "1px solid rgba(60,110,200,0.3)", color: "#e0eeff" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label style={{ color: "#fda4af" }}>اسم المستخدم (للدخول)</Label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                dir="ltr"
                className="h-11"
                style={{ background: "rgba(10,20,50,0.8)", border: "1px solid rgba(60,110,200,0.3)", color: "#e0eeff" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "#fda4af" }}>كلمة المرور (اتركها فارغة لعدم التغيير)</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="h-11"
                style={{ background: "rgba(10,20,50,0.8)", border: "1px solid rgba(60,110,200,0.3)", color: "#e0eeff" }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "#4dd27a" }}>يوزر Roblox (للرادار)</Label>
            <Input
              value={robloxUsername}
              onChange={e => setRobloxUsername(e.target.value)}
              dir="ltr"
              className="h-11"
              placeholder="اسم المستخدم في روبلوكس"
              style={{ background: "rgba(10,20,50,0.8)", border: "1px solid rgba(60,110,200,0.3)", color: "#e0eeff" }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-11 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              style={{ background: "linear-gradient(135deg, #1558e0 0%, #0035aa 100%)", color: "#fff" }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "حفظ التغييرات"}
            </button>
            <button
              onClick={onClose}
              className="h-11 px-5 rounded-lg font-bold text-sm transition-colors"
              style={{ background: "rgba(30,50,90,0.6)", color: "#7aa8d8", border: "1px solid rgba(60,100,200,0.3)" }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Soldier profile dialog ────────────────────────────────────────────────────
function ProfileDialog({ soldier, onClose }: { soldier: SoldierFull; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-lg overflow-hidden"
        style={{ background: "rgba(7,15,40,0.98)", border: "1px solid rgba(50,100,200,0.4)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-5 flex items-center gap-4 relative"
          style={{ background: "linear-gradient(135deg, rgba(15,40,100,0.8) 0%, rgba(8,18,50,0.8) 100%)", borderBottom: "1px solid rgba(50,100,200,0.25)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(20,60,160,0.4)", border: "2px solid rgba(80,140,255,0.4)" }}>
            <Shield className="w-7 h-7" style={{ color: "#4da6ff" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-white">{soldier.name}</h2>
            <p className="text-sm" style={{ color: "#7aa8d8" }}>{soldier.rank} — {soldier.unit}</p>
          </div>
          <button onClick={onClose} className="absolute top-4 left-4">
            <X className="w-5 h-5 text-muted-foreground hover:text-white transition-colors" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={soldier.isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}>
              {soldier.isCheckedIn ? "مداوم" : "غائب"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBox label="التحذيرات" value={`${soldier.warningsCount} تحذير`} color="#fb923c" />
            <StatBox label="وقت اليوم" value={formatMinutes(soldier.todayMinutes)} color="#7dd3fc" />
            <StatBox label="إجمالي الوقت" value={formatMinutes(soldier.totalMinutes)} color="#86efac" />
            <StatBox label="آخر دخول" value={soldier.lastCheckIn ? format(new Date(soldier.lastCheckIn), "MM/dd HH:mm") : "—"} color="#fda4af" />
          </div>

          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(10,20,55,0.6)", border: "1px solid rgba(50,100,200,0.2)" }}>
            <InfoRow label="الرتبة" value={soldier.rank} color="#c4b5fd" />
            <InfoRow label="الوحدة" value={soldier.unit} color="#86efac" />
            <InfoRow label="العمر" value={`${soldier.age} سنة`} color="#7dd3fc" />
          </div>

          {soldier.warnings.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase mb-2" style={{ color: "#fb923c" }}>التحذيرات</p>
              <div className="space-y-2">
                {soldier.warnings.map(w => (
                  <div key={w.id} className="p-3 rounded-lg" style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)" }}>
                    <p className="text-sm font-bold text-white">{w.reason}</p>
                    <div className="flex justify-between text-xs mt-1" style={{ color: "#7aa8d8" }}>
                      <span>{w.givenBy}</span>
                      <span className="font-mono">{format(new Date(w.createdAt), "yyyy/MM/dd")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(10,20,55,0.6)", border: `1px solid ${color}33` }}>
      <p className="text-xs mb-1" style={{ color: "rgba(150,170,200,0.8)" }}>{label}</p>
      <p className="font-black text-sm" style={{ color }}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: "rgba(150,170,200,0.7)" }}>{label}:</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Soldiers() {
  const { data: soldiers, isLoading } = useListSoldiers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  const [profileSoldier, setProfileSoldier] = useState<SoldierFull | null>(null);
  const [editSoldier, setEditSoldier] = useState<SoldierFull | null>(null);

  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  const deleteMutation = useDeleteSoldier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });
        toast({ title: "تم حذف الفرد بنجاح" });
      },
      onError: (err: any) => {
        toast({ title: "خطأ", description: err.error || "حدث خطأ أثناء الحذف", variant: "destructive" });
      }
    }
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });

  return (
    <AppLayout>
      {profileSoldier && <ProfileDialog soldier={profileSoldier} onClose={() => setProfileSoldier(null)} />}
      {editSoldier && (
        <EditSoldierDialog
          soldier={editSoldier}
          onClose={() => setEditSoldier(null)}
          onDone={refresh}
        />
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>إدارة الأفراد</h2>
            <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>سجل القوة الكامل — خاص بالقيادة</p>
          </div>
          <Link href="/soldiers/new"
            className="h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors shrink-0"
            style={{ background: "linear-gradient(135deg, #1558e0 0%, #0035aa 100%)", color: "#fff" }}>
            إضافة فرد
          </Link>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: "#86efac" }}>
              <Users className="w-5 h-5" />
              سجل الأفراد الكامل
              <span className="mr-auto text-xs font-normal" style={{ color: "#7aa8d8" }}>
                {soldiers?.length ?? 0} فرد — اضغط على الاسم لعرض البروفايل
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                <span className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-2" />
                جاري التحميل...
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border/30">
                  {(soldiers as SoldierFull[])?.map(soldier => (
                    <div key={soldier.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button
                            className="font-bold text-sm text-left hover:underline"
                            style={{ color: "#7dd3fc" }}
                            onClick={() => setProfileSoldier(soldier)}
                          >
                            {soldier.name}
                          </button>
                          <p className="text-xs" style={{ color: "#c4b5fd" }}>{soldier.rank} — {soldier.unit}</p>
                          {soldier.username && <p className="text-xs font-mono" style={{ color: "#94a3b8" }}>@{soldier.username}</p>}
                        </div>
                        <Badge className={`text-xs shrink-0 ${soldier.isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}`}>
                          {soldier.isCheckedIn ? "مداوم" : "غائب"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <span style={{ color: "#fbbf24" }}>العمر: {soldier.age}</span>
                        <span style={{ color: "#86efac" }}>النقاط: {soldier.points}</span>
                        <span style={{ color: "#7dd3fc" }}>{formatMinutes(soldier.totalMinutes)}</span>
                      </div>
                      {soldier.robloxUsername && (
                        <p className="text-xs font-mono" style={{ color: "#4dd27a" }}>Roblox: {soldier.robloxUsername}</p>
                      )}
                      {soldier.busyStatus && (
                        <p className="text-xs px-2 py-0.5 rounded-full w-fit" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                          مشغول: {soldier.busyStatus}
                        </p>
                      )}
                      {soldier.warningsCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-orange-400"><AlertTriangle className="w-3 h-3" />{soldier.warningsCount} تحذير</span>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setEditSoldier(soldier)} className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{ background: "rgba(77,166,255,0.15)", color: "#7dd3fc", border: "1px solid rgba(77,166,255,0.3)" }}>
                          <Pencil className="w-3 h-3" /> تعديل
                        </button>
                        <button onClick={() => { if (confirm("حذف؟")) deleteMutation.mutate({ id: soldier.id }); }}
                          className="text-xs px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                  {soldiers?.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">لا يوجد أفراد</p>}
                </div>

                {/* Desktop full table */}
                <div className="hidden md:block relative w-full overflow-x-auto">
                  <table className="w-full caption-bottom text-sm" style={{ minWidth: "1200px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid rgba(50,100,200,0.3)", background: "rgba(8,18,50,0.6)" }}>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#94a3b8" }}>#</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#7dd3fc" }}>الاسم</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#c4b5fd" }}>الرتبة</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#86efac" }}>الوحدة</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#fbbf24" }}>العمر</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#fda4af" }}>اسم الدخول</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#4dd27a" }}>Roblox</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#38bdf8" }}>النقاط</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#a3e635" }}>الحالة</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#fbbf24" }}>مشغول</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#7dd3fc" }}>وقت اليوم</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#86efac" }}>إجمالي</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#fb923c" }}>تحذيرات</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#94a3b8" }}>تاريخ الانضمام</th>
                        <th className="h-11 px-3 text-right align-middle font-bold text-xs uppercase" style={{ color: "#64748b" }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(soldiers as SoldierFull[])?.map((soldier, idx) => (
                        <tr key={soldier.id} className="transition-colors hover:bg-white/5" style={{ borderBottom: "1px solid rgba(50,100,200,0.1)" }}>
                          <td className="p-3 align-middle text-xs font-mono" style={{ color: "rgba(100,116,139,0.8)" }}>{idx + 1}</td>
                          <td className="p-3 align-middle">
                            <button
                              onClick={() => setProfileSoldier(soldier)}
                              className="font-bold hover:underline text-right whitespace-nowrap"
                              style={{ color: "#7dd3fc" }}
                            >
                              {soldier.name}
                            </button>
                          </td>
                          <td className="p-3 align-middle">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "rgba(196,181,253,0.12)", color: "#c4b5fd", border: "1px solid rgba(196,181,253,0.2)" }}>
                              {soldier.rank}
                            </span>
                          </td>
                          <td className="p-3 align-middle text-xs font-mono font-bold" style={{ color: "#86efac" }}>{soldier.unit}</td>
                          <td className="p-3 align-middle text-xs text-center" style={{ color: "#fbbf24" }}>{soldier.age}</td>
                          <td className="p-3 align-middle text-xs font-mono" style={{ color: "#fda4af" }}>{soldier.username ?? "—"}</td>
                          <td className="p-3 align-middle text-xs font-mono" style={{ color: "#4dd27a" }}>{soldier.robloxUsername ?? "—"}</td>
                          <td className="p-3 align-middle text-xs font-bold text-center" style={{ color: "#38bdf8" }}>{soldier.points}</td>
                          <td className="p-3 align-middle">
                            <Badge className={`text-xs w-fit whitespace-nowrap ${soldier.isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}`}>
                              {soldier.isCheckedIn ? "✓ مداوم" : "✗ غائب"}
                            </Badge>
                          </td>
                          <td className="p-3 align-middle text-xs" style={{ color: "#fbbf24" }}>
                            {soldier.busyStatus
                              ? <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>{soldier.busyStatus}</span>
                              : <span style={{ color: "rgba(100,116,139,0.5)" }}>—</span>}
                          </td>
                          <td className="p-3 align-middle font-mono text-xs text-center" style={{ color: "#7dd3fc" }}>{formatMinutes(soldier.todayMinutes)}</td>
                          <td className="p-3 align-middle font-mono text-xs text-center" style={{ color: "#86efac" }}>{formatMinutes(soldier.totalMinutes)}</td>
                          <td className="p-3 align-middle text-center">
                            {soldier.warningsCount > 0 ? (
                              <Badge variant="outline" className="text-xs" style={{ color: "#fb923c", borderColor: "rgba(251,146,60,0.4)", background: "rgba(251,146,60,0.1)" }}>
                                <AlertTriangle className="w-3 h-3 ml-1" />{soldier.warningsCount}
                              </Badge>
                            ) : <span className="text-xs" style={{ color: "rgba(100,116,139,0.4)" }}>—</span>}
                          </td>
                          <td className="p-3 align-middle text-xs font-mono whitespace-nowrap" style={{ color: "rgba(100,116,139,0.7)" }}>
                            {soldier.lastCheckIn ? format(new Date(soldier.lastCheckIn), "MM/dd HH:mm") : "—"}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditSoldier(soldier)}
                                className="text-xs px-2 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1"
                                style={{ background: "rgba(77,166,255,0.15)", color: "#7dd3fc", border: "1px solid rgba(77,166,255,0.3)" }}
                              >
                                <Pencil className="w-3 h-3" /> تعديل
                              </button>
                              <button
                                onClick={() => { if (confirm(`حذف ${soldier.name}؟`)) deleteMutation.mutate({ id: soldier.id }); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {soldiers?.length === 0 && (
                        <tr><td colSpan={15} className="h-24 text-center text-muted-foreground">لا يوجد أفراد</td></tr>
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
