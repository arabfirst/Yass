import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  useGetDashboardStats,
  useListSoldiers,
  useCheckIn,
  useCheckOut,
  getListSoldiersQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import {
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  Clock,
  AlertCircle,
  Star,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/layout";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const BUSY_COLORS: Record<string, string> = {
  "تحقيق": "#f59e0b",
  "ايصال سجين": "#8b5cf6",
  "اصطفاف عسكري": "#3b82f6",
  "اغراض شخصية": "#6b7280",
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h}س ${m}د`;
}

type SoldierFull = {
  id: number;
  name: string;
  rank: string;
  unit: string;
  age: number;
  isCheckedIn: boolean;
  busyStatus: string | null;
  points: number;
  totalMinutes: number;
  todayMinutes: number;
  warningsCount: number;
};

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: soldiers, isLoading: soldiersLoading } = useListSoldiers();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <AppLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight uppercase"
            style={{ color: "#38bdf8", textShadow: "0 0 20px rgba(56,189,248,0.3)" }}
          >
            مركز القيادة
          </h2>
          <p className="mt-2 text-sm md:text-base font-bold tracking-wide" style={{ color: "#94a3b8" }}>
            {isAdmin ? "نظرة عامة على حالة القوات والعمليات" : "جدول العساكر والحضور"}
          </p>
        </motion.div>

        {/* Admin-only: Stats grid */}
        {isAdmin && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            <StatCard
              title="إجمالي القوة"
              value={stats?.totalSoldiers || 0}
              icon={<Users className="w-5 h-5 text-sky-400" />}
              loading={statsLoading}
            />
            <StatCard
              title="القوة الحاضرة"
              value={stats?.checkedInCount || 0}
              icon={<UserCheck className="w-5 h-5 text-emerald-400" />}
              loading={statsLoading}
              glowColor="rgba(52, 211, 153, 0.2)"
            />
            <StatCard
              title="الغياب"
              value={stats?.checkedOutCount || 0}
              icon={<UserMinus className="w-5 h-5 text-rose-400" />}
              loading={statsLoading}
              glowColor="rgba(244, 63, 94, 0.15)"
            />
            <StatCard
              title="حركات اليوم"
              value={stats?.todayCheckIns || 0}
              icon={<Clock className="w-5 h-5 text-amber-400" />}
              loading={statsLoading}
            />
          </motion.div>
        )}

        {/* Admin-only: Check-in / Check-out buttons */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3">
            <CheckInDialog soldiers={soldiers || []} />
            <CheckOutDialog soldiers={soldiers || []} />
          </div>
        )}

        {/* Soldiers table — visible to ALL users */}
        <Card
          className="border-border bg-card/50 backdrop-blur"
          style={{ borderColor: "rgba(50,100,200,0.3)" }}
        >
          <CardHeader className="pb-3">
            <CardTitle
              className="flex items-center gap-2 text-base md:text-lg"
              style={{ color: "#86efac" }}
            >
              <ShieldCheck className="w-5 h-5" />
              جدول الأفراد
              <div className="mr-auto flex items-center gap-2">
                <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                  {(soldiers as SoldierFull[])?.filter((s) => s.isCheckedIn).length ?? 0} حاضر
                </Badge>
                <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/50">
                  {(soldiers as SoldierFull[])?.filter((s) => !s.isCheckedIn).length ?? 0} غائب
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {soldiersLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                <span className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-2" />
                جاري التحميل...
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-border/50">
                  {(soldiers as SoldierFull[])?.map((soldier) => (
                    <div
                      key={soldier.id}
                      className="px-4 py-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-white">{soldier.name}</p>
                          <p className="text-xs" style={{ color: "#c4b5fd" }}>
                            {soldier.rank} — {soldier.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <Badge
                            className={`text-xs ${
                              soldier.isCheckedIn
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                                : "bg-destructive/20 text-destructive-foreground border-destructive/50"
                            }`}
                          >
                            {soldier.isCheckedIn ? "مداوم" : "غائب"}
                          </Badge>
                          {soldier.busyStatus && (
                            <Badge
                              className="text-xs"
                              style={{
                                background: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}22`,
                                color: BUSY_COLORS[soldier.busyStatus],
                                borderColor: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}55`,
                              }}
                            >
                              {soldier.busyStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs" style={{ color: "#7aa8d8" }}>
                        <span>
                          <Clock className="w-3 h-3 inline ml-0.5" />
                          {formatMinutes(soldier.todayMinutes)} اليوم
                        </span>
                        <span>
                          <Star className="w-3 h-3 inline ml-0.5 text-yellow-400" />
                          {soldier.points} ن
                        </span>
                        {soldier.warningsCount > 0 && (
                          <span className="text-orange-400">
                            <AlertTriangle className="w-3 h-3 inline ml-0.5" />
                            {soldier.warningsCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {soldiers?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      لا يوجد أفراد
                    </p>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(50,100,200,0.2)" }}>
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
                          الحالة
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#7dd3fc" }}
                        >
                          وقت اليوم
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#86efac" }}
                        >
                          إجمالي الوقت
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#fbbf24" }}
                        >
                          النقاط
                        </th>
                        <th
                          className="h-11 px-4 text-right align-middle font-bold text-xs uppercase"
                          style={{ color: "#fb923c" }}
                        >
                          التحذيرات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {(soldiers as SoldierFull[])?.map((soldier) => (
                        <tr
                          key={soldier.id}
                          className="transition-colors hover:bg-white/5"
                          style={{ borderBottom: "1px solid rgba(50,100,200,0.12)" }}
                        >
                          <td className="p-4 align-middle font-bold" style={{ color: "#e0eeff" }}>
                            {soldier.name}
                          </td>
                          <td
                            className="p-4 align-middle text-xs font-semibold"
                            style={{ color: "#c4b5fd" }}
                          >
                            {soldier.rank}
                          </td>
                          <td className="p-4 align-middle text-xs" style={{ color: "#86efac" }}>
                            {soldier.unit}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex flex-col gap-1">
                              <Badge
                                className={`text-xs w-fit ${
                                  soldier.isCheckedIn
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                                    : "bg-red-500/20 text-red-400 border-red-500/50"
                                }`}
                              >
                                {soldier.isCheckedIn ? "مداوم ✓" : "غائب ✗"}
                              </Badge>
                              {soldier.busyStatus && (
                                <Badge
                                  className="text-xs w-fit"
                                  style={{
                                    background: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}22`,
                                    color: BUSY_COLORS[soldier.busyStatus] || "#9ca3af",
                                    borderColor: `${BUSY_COLORS[soldier.busyStatus] || "#6b7280"}55`,
                                  }}
                                >
                                  {soldier.busyStatus}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td
                            className="p-4 align-middle font-mono text-xs"
                            style={{ color: "#7dd3fc" }}
                          >
                            {formatMinutes(soldier.todayMinutes)}
                          </td>
                          <td
                            className="p-4 align-middle font-mono text-xs"
                            style={{ color: "#86efac" }}
                          >
                            {formatMinutes(soldier.totalMinutes)}
                          </td>
                          <td className="p-4 align-middle">
                            <span className="font-black text-sm" style={{ color: "#fbbf24" }}>
                              {soldier.points}
                            </span>
                          </td>
                          <td className="p-4 align-middle">
                            {soldier.warningsCount > 0 ? (
                              <Badge
                                variant="outline"
                                style={{
                                  color: "#fb923c",
                                  borderColor: "rgba(251,146,60,0.4)",
                                  background: "rgba(251,146,60,0.1)",
                                }}
                              >
                                <AlertTriangle className="w-3 h-3 ml-1" />
                                {soldier.warningsCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {soldiers?.length === 0 && (
                        <tr>
                          <td colSpan={8} className="h-24 text-center text-muted-foreground">
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

function StatCard({
  title,
  value,
  icon,
  loading,
  glowColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  glowColor?: string;
}) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
      <Card
        className="relative overflow-hidden border-border bg-slate-900/60 backdrop-blur-md transition-all hover:bg-slate-800/80"
        style={{
          borderColor: "rgba(56, 189, 248, 0.2)",
          boxShadow: glowColor ? `0 0 30px ${glowColor}` : "none"
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 md:px-6 md:pt-6">
          <CardTitle className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400 leading-tight">
            {title}
          </CardTitle>
          <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
            {icon}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
          {loading ? (
            <div className="h-10 w-16 bg-slate-800 animate-pulse rounded" />
          ) : (
            <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">{value}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CheckInDialog({ soldiers }: { soldiers: any[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkInMutation = useCheckIn({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: "تم تسجيل الدخول بنجاح" });
        setOpen(false);
        setSelectedId("");
      },
      onError: (err: any) => {
        toast({ title: "خطأ", description: err.error || "حدث خطأ", variant: "destructive" });
      },
    },
  });

  const handleCheckIn = () => {
    if (!selectedId) return;
    checkInMutation.mutate({ id: parseInt(selectedId, 10) });
  };

  const eligibleSoldiers = soldiers.filter((s) => !s.isCheckedIn);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 md:h-14 text-base md:text-lg w-full sm:w-auto"
        >
          <UserCheck className="w-5 h-5 ml-2" />
          تسجيل دخول فرد
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px] w-[calc(100vw-2rem)] rounded-xl"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            تسجيل دخول
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الفرد..." />
            </SelectTrigger>
            <SelectContent>
              {eligibleSoldiers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  لا يوجد أفراد مسجلين خروج
                </div>
              ) : (
                eligibleSoldiers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.rank} / {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCheckIn}
            disabled={!selectedId || checkInMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {checkInMutation.isPending ? "جاري التنفيذ..." : "تأكيد الدخول"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckOutDialog({ soldiers }: { soldiers: any[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkOutMutation = useCheckOut({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: "تم تسجيل الخروج بنجاح" });
        setOpen(false);
        setSelectedId("");
      },
      onError: (err: any) => {
        toast({ title: "خطأ", description: err.error || "حدث خطأ", variant: "destructive" });
      },
    },
  });

  const handleCheckOut = () => {
    if (!selectedId) return;
    checkOutMutation.mutate({ id: parseInt(selectedId, 10) });
  };

  const eligibleSoldiers = soldiers.filter((s) => s.isCheckedIn);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="destructive"
          className="font-bold h-12 md:h-14 text-base md:text-lg w-full sm:w-auto"
        >
          <UserMinus className="w-5 h-5 ml-2" />
          تسجيل خروج فرد
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px] w-[calc(100vw-2rem)] rounded-xl"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            تسجيل خروج
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الفرد..." />
            </SelectTrigger>
            <SelectContent>
              {eligibleSoldiers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  لا يوجد أفراد مسجلين دخول
                </div>
              ) : (
                eligibleSoldiers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.rank} / {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCheckOut}
            disabled={!selectedId || checkOutMutation.isPending}
            variant="destructive"
            className="w-full"
          >
            {checkOutMutation.isPending ? "جاري التنفيذ..." : "تأكيد الخروج"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
