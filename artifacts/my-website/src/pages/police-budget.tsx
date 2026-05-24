import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Landmark, ArrowDownCircle, ArrowUpCircle, Clock,
  TrendingUp, TrendingDown, Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Transaction = {
  id: number;
  type: string;
  amount: number;
  soldierName: string;
  note: string | null;
  createdAt: string;
};

type BudgetData = {
  balance: number;
  transactions: Transaction[];
};

type MutationResult = {
  success: boolean;
  newBudget: number;
  newBalance: number;
  message: string;
};

const TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode; sign: string }> = {
  deposit:          { label: "إيداع",           color: "#4ade80", icon: <ArrowDownCircle className="w-4 h-4" />, sign: "+" },
  withdraw:         { label: "سحب",             color: "#f87171", icon: <ArrowUpCircle className="w-4 h-4" />,   sign: "-" },
  vehicle_purchase: { label: "شراء سيارة",      color: "#fb923c", icon: <TrendingDown className="w-4 h-4" />,   sign: "-" },
  vehicle_revoke:   { label: "استرداد سيارة",   color: "#86efac", icon: <TrendingUp className="w-4 h-4" />,     sign: "+" },
  fine_paid:        { label: "غرامة",           color: "#fbbf24", icon: <TrendingUp className="w-4 h-4" />,     sign: "+" },
  seizure:          { label: "مصادرة",          color: "#c084fc", icon: <TrendingUp className="w-4 h-4" />,     sign: "+" },
};

export default function PoliceBudget() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");

  const { data, isLoading, error } = useQuery<BudgetData>({
    queryKey: ["police-budget"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/police-budget`, { credentials: "include" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "خطأ في جلب البيانات");
      }
      return res.json();
    },
  });

  const depositMutation = useMutation<MutationResult, Error, { amount: number; note: string }>({
    mutationFn: async ({ amount, note }) => {
      const res = await fetch(`${BASE}/api/police-budget/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      toast({
        title: "تم الإيداع بنجاح",
        description: `${d.message} — ميزانية الشرطة: $${d.newBudget?.toLocaleString()}`,
      });
      setDepositAmount("");
      setDepositNote("");
      queryClient.invalidateQueries({ queryKey: ["police-budget"] });
    },
    onError: (e) => toast({ title: "خطأ في الإيداع", description: e.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation<MutationResult, Error, { amount: number; note: string }>({
    mutationFn: async ({ amount, note }) => {
      const res = await fetch(`${BASE}/api/police-budget/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      toast({
        title: "تم السحب بنجاح",
        description: `${d.message} — ميزانية الشرطة: $${d.newBudget?.toLocaleString()}`,
      });
      setWithdrawAmount("");
      setWithdrawNote("");
      queryClient.invalidateQueries({ queryKey: ["police-budget"] });
    },
    onError: (e) => toast({ title: "خطأ في السحب", description: e.message, variant: "destructive" }),
  });

  const handleDeposit = () => {
    const amount = parseInt(depositAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) return toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
    depositMutation.mutate({ amount, note: depositNote });
  };

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) return toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
    withdrawMutation.mutate({ amount, note: withdrawNote });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-red-400">
          <p>{(error as Error).message}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>
            ميزانية الشرطة
          </h2>
          <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
            {isAdmin ? "عرض الميزانية والمعاملات المالية" : "إدارة ميزانية قسم الشرطة"}
          </p>
        </div>

        {/* Police Budget Balance */}
        <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardContent className="p-8 text-center">
            <Landmark className="w-12 h-12 mx-auto mb-4" style={{ color: "#4da6ff" }} />
            <p className="text-sm font-semibold mb-2" style={{ color: "#7aa8d8" }}>الرصيد الحالي لميزانية الشرطة</p>
            <p className="text-5xl font-black" style={{ color: "#4ade80" }}>
              ${(data?.balance ?? 0).toLocaleString()}
            </p>
            {isAdmin && (
              <Badge className="mt-4 text-xs" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c", borderColor: "rgba(251,146,60,0.3)" }}>
                صلاحية العرض فقط
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Deposit & Withdraw (Lieutenant+ only, not admin) */}
        {!isAdmin && (
          <>
            {/* How it works info */}
            <div
              className="rounded-xl p-4 flex gap-3 items-start"
              style={{ background: "rgba(77,166,255,0.07)", border: "1px solid rgba(77,166,255,0.2)" }}
            >
              <Wallet className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#7dd3fc" }} />
              <div className="text-sm" style={{ color: "#93c5fd" }}>
                <p className="font-bold mb-1" style={{ color: "#bfdbfe" }}>كيف تعمل العمليات المالية؟</p>
                <ul className="space-y-1 text-xs" style={{ color: "#7aa8d8" }}>
                  <li>• <span className="font-semibold" style={{ color: "#4ade80" }}>الإيداع</span> — يُخصم المبلغ من حسابك البنكي ويُضاف إلى ميزانية الشرطة</li>
                  <li>• <span className="font-semibold" style={{ color: "#f87171" }}>السحب</span> — يُخصم المبلغ من ميزانية الشرطة ويُضاف إلى حسابك البنكي</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Deposit */}
              <Card className="border-border bg-card/50" style={{ borderColor: "rgba(74,222,128,0.3)" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#4ade80" }}>
                    <ArrowDownCircle className="w-5 h-5" />
                    إيداع في الميزانية
                  </CardTitle>
                  <p className="text-xs" style={{ color: "#7aa8d8" }}>المبلغ يُخصم من رصيدك البنكي</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs mb-1 font-semibold" style={{ color: "#7aa8d8" }}>المبلغ ($)</p>
                    <Input
                      placeholder="مثال: 50000"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      type="number"
                      min="1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1 font-semibold" style={{ color: "#7aa8d8" }}>ملاحظة (اختياري)</p>
                    <Input
                      placeholder="سبب الإيداع..."
                      value={depositNote}
                      onChange={e => setDepositNote(e.target.value)}
                      dir="rtl"
                    />
                  </div>
                  <Button
                    className="w-full font-bold"
                    style={{ background: "#16a34a" }}
                    onClick={handleDeposit}
                    disabled={depositMutation.isPending || !depositAmount}
                  >
                    {depositMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري التنفيذ...
                      </span>
                    ) : "إيداع في الميزانية"}
                  </Button>
                  {depositMutation.isSuccess && depositMutation.data && (
                    <div className="rounded-lg p-3 text-center text-sm" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <p style={{ color: "#4ade80" }}>رصيدك الجديد: <strong>${depositMutation.data.newBalance.toLocaleString()}</strong></p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Withdraw */}
              <Card className="border-border bg-card/50" style={{ borderColor: "rgba(248,113,113,0.3)" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#f87171" }}>
                    <ArrowUpCircle className="w-5 h-5" />
                    سحب من الميزانية
                  </CardTitle>
                  <p className="text-xs" style={{ color: "#7aa8d8" }}>المبلغ يُضاف إلى رصيدك البنكي</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs mb-1 font-semibold" style={{ color: "#7aa8d8" }}>المبلغ ($)</p>
                    <Input
                      placeholder="مثال: 50000"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      type="number"
                      min="1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1 font-semibold" style={{ color: "#7aa8d8" }}>ملاحظة (اختياري)</p>
                    <Input
                      placeholder="سبب السحب..."
                      value={withdrawNote}
                      onChange={e => setWithdrawNote(e.target.value)}
                      dir="rtl"
                    />
                  </div>
                  <Button
                    className="w-full font-bold"
                    variant="destructive"
                    onClick={handleWithdraw}
                    disabled={withdrawMutation.isPending || !withdrawAmount}
                  >
                    {withdrawMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري التنفيذ...
                      </span>
                    ) : "سحب من الميزانية"}
                  </Button>
                  {withdrawMutation.isSuccess && withdrawMutation.data && (
                    <div className="rounded-lg p-3 text-center text-sm" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                      <p style={{ color: "#f87171" }}>رصيدك الجديد: <strong>${withdrawMutation.data.newBalance.toLocaleString()}</strong></p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Transaction Log */}
        <Card className="border-border bg-card/50" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#c4b5fd" }}>
              <Clock className="w-5 h-5" />
              سجل المعاملات
              <Badge className="mr-auto text-xs" style={{ background: "rgba(196,181,253,0.15)", color: "#c4b5fd", borderColor: "rgba(196,181,253,0.3)" }}>
                آخر 100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.transactions?.length ? (
              <div className="py-10 text-center text-muted-foreground text-sm">لا يوجد معاملات</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(50,100,200,0.12)" }}>
                {data.transactions.map(t => {
                  const meta = TYPE_LABELS[t.type] ?? {
                    label: t.type, color: "#94a3b8",
                    icon: <TrendingDown className="w-4 h-4" />, sign: "",
                  };
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-4 py-3">
                      <span style={{ color: meta.color }}>{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className="text-xs"
                            style={{
                              background: `${meta.color}22`,
                              color: meta.color,
                              borderColor: `${meta.color}44`,
                            }}
                          >
                            {meta.label}
                          </Badge>
                          <span className="text-sm font-semibold" style={{ color: "#e0eeff" }}>
                            {t.soldierName}
                          </span>
                        </div>
                        {t.note && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "#7aa8d8" }}>{t.note}</p>
                        )}
                      </div>
                      <div className="text-left shrink-0">
                        <p className="font-black text-sm" style={{ color: meta.color }}>
                          {meta.sign}${t.amount.toLocaleString()}
                        </p>
                        <p className="text-xs" style={{ color: "#475569" }}>
                          {new Date(t.createdAt).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
