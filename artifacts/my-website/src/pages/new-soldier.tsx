import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateSoldier, getListSoldiersQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const RANKS = [
  "Cadet", "Officer 1", "Officer 2", "Officer 3",
  "Sergeant 1", "Sergeant 2", "Sergeant 3",
  "Lieutenant", "First Lieutenant", "Captain", "Major",
  "Lieutenant Colonel", "Colonel", "Brigadier General",
  "Major General", "Lieutenant General", "General",
  "Deputy Commander", "High Commander", "Chief of Marshal", "Police Chief",
  "Minister of Interior",
];

const soldierSchema = z.object({
  name: z.string().min(1, { message: "الاسم مطلوب" }),
  rank: z.string().min(1, { message: "الرتبة مطلوبة" }),
  unit: z.string().min(1, { message: "الوحدة مطلوبة" }),
  age: z.coerce.number().min(18, { message: "العمر يجب أن يكون 18 على الأقل" }),
  username: z.string().optional(),
  password: z.string().optional(),
  robloxUsername: z.string().optional(),
});

export default function NewSoldier() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rankOpen, setRankOpen] = useState(false);

  const form = useForm<z.infer<typeof soldierSchema>>({
    resolver: zodResolver(soldierSchema),
    defaultValues: { name: "", rank: "", unit: "", age: 20, username: "", password: "", robloxUsername: "" },
  });

  const createMutation = useCreateSoldier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });
        toast({ title: "تم إضافة الفرد بنجاح" });
        setLocation("/soldiers");
      },
      onError: (err: any) => {
        toast({ title: "خطأ", description: err.error || "حدث خطأ أثناء الإضافة", variant: "destructive" });
      }
    }
  });

  const onSubmit = async (data: z.infer<typeof soldierSchema>) => {
    const body = {
      ...data,
      username: data.username || undefined,
      password: data.password || undefined,
      robloxUsername: data.robloxUsername || undefined,
    };
    createMutation.mutate({ data: body as any });
  };

  const selectedRank = form.watch("rank");

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto" dir="rtl">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>إضافة فرد جديد</h2>
          <p className="mt-2 font-medium" style={{ color: "#7aa8d8" }}>تسجيل فرد جديد في القوة</p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur shadow-2xl" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: "#7dd3fc" }}>
              <PlusCircle className="w-5 h-5" />
              بيانات الفرد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" style={{ color: "#9bbfdf" }}>الاسم الكامل</Label>
                <Input id="name" {...form.register("name")} className="bg-background/50 border-border h-12" autoComplete="off" />
                {form.formState.errors.name && <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Rank dropdown */}
                <div className="space-y-2">
                  <Label style={{ color: "#c4b5fd" }}>الرتبة</Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setRankOpen(v => !v)}
                      className="w-full h-12 px-3 rounded-md text-sm text-right flex items-center justify-between"
                      style={{
                        background: "rgba(10,20,50,0.8)",
                        border: "1px solid rgba(60,110,200,0.3)",
                        color: selectedRank ? "#e0eeff" : "rgba(150,170,200,0.6)",
                      }}
                    >
                      <span>{selectedRank || "اختر الرتبة..."}</span>
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#7aa8d8" }} />
                    </button>
                    {rankOpen && (
                      <div
                        className="absolute z-50 w-full mt-1 rounded-md overflow-auto max-h-64"
                        style={{
                          background: "rgba(8,18,45,0.98)",
                          border: "1px solid rgba(60,110,200,0.35)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                        }}
                      >
                        {RANKS.map((rank, i) => (
                          <button
                            key={rank}
                            type="button"
                            onClick={() => { form.setValue("rank", rank); setRankOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-right flex items-center gap-2 hover:bg-white/10 transition-colors"
                            style={{ color: rank === selectedRank ? "#4da6ff" : "#c8deff" }}
                          >
                            <span className="text-xs w-5 shrink-0" style={{ color: "rgba(150,170,200,0.5)" }}>
                              {i + 1}
                            </span>
                            {rank}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.formState.errors.rank && <p className="text-sm text-red-400">{form.formState.errors.rank.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" style={{ color: "#86efac" }}>الوحدة</Label>
                  <Input id="unit" {...form.register("unit")} className="bg-background/50 border-border h-12" autoComplete="off" />
                  {form.formState.errors.unit && <p className="text-sm text-red-400">{form.formState.errors.unit.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" style={{ color: "#fbbf24" }}>العمر</Label>
                <Input id="age" type="number" {...form.register("age")} className="bg-background/50 border-border h-12" />
                {form.formState.errors.age && <p className="text-sm text-red-400">{form.formState.errors.age.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" style={{ color: "#fda4af" }}>اسم المستخدم (للدخول)</Label>
                  <Input id="username" {...form.register("username")} className="bg-background/50 border-border h-12" autoComplete="off" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" style={{ color: "#fda4af" }}>كلمة المرور (للدخول)</Label>
                  <Input id="password" type="password" {...form.register("password")} className="bg-background/50 border-border h-12" autoComplete="new-password" dir="ltr" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="robloxUsername" style={{ color: "#4dd27a" }}>يوزر Roblox (للرادار)</Label>
                <Input id="robloxUsername" {...form.register("robloxUsername")} className="bg-background/50 border-border h-12" autoComplete="off" dir="ltr" placeholder="اسم المستخدم في روبلوكس" />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1 h-12 text-lg font-bold"
                  disabled={createMutation.isPending}
                  style={{ background: "linear-gradient(135deg, #1558e0 0%, #0035aa 100%)" }}
                >
                  {createMutation.isPending ? "جاري الحفظ..." : "إضافة الفرد"}
                </Button>
                <Button type="button" variant="outline" className="h-12" onClick={() => setLocation("/soldiers")}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
