import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Car, Landmark, ShoppingCart, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Vehicle = {
  key: string;
  name: string;
  nameAr: string;
  desc: string;
  descAr: string;
  price: number;
  image: string;
};

type Soldier = {
  id: number;
  name: string;
  rank: string;
};

export default function PoliceVehicles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: catalogData } = useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ["police-vehicles-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/police-vehicles/catalog");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  const { data: soldiersData } = useQuery<Soldier[]>({
    queryKey: ["soldiers-list"],
    queryFn: async () => {
      const res = await fetch("/api/soldiers");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  const { data: budgetData } = useQuery<{ balance: number; transactions: any[] }>({
    queryKey: ["police-budget"],
    queryFn: async () => {
      const res = await fetch("/api/police-budget");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ soldierId, vehicleKey }: { soldierId: number; vehicleKey: string }) => {
      const res = await fetch("/api/police-vehicles/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soldierId, vehicleKey }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      toast({ title: `تم شراء السيارة وتسليمها — الميزانية المتبقية: $${d.newBudget?.toLocaleString()}` });
      setDialogOpen(false);
      setSelectedVehicle(null);
      setSelectedSoldierId("");
      queryClient.invalidateQueries({ queryKey: ["police-budget"] });
      queryClient.invalidateQueries({ queryKey: ["police-vehicles-all"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleBuy = (v: Vehicle) => {
    setSelectedVehicle(v);
    setSelectedSoldierId("");
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedVehicle || !selectedSoldierId) return;
    assignMutation.mutate({ soldierId: parseInt(selectedSoldierId), vehicleKey: selectedVehicle.key });
  };

  const budget = budgetData?.balance ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>
              سيارات الشرطة
            </h2>
            <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
              شراء وتسليم سيارات الشرطة للأفراد
            </p>
          </div>
          <Card className="border-border bg-card/50 px-5 py-3 flex items-center gap-3" style={{ borderColor: "rgba(74,222,128,0.3)" }}>
            <Landmark className="w-5 h-5" style={{ color: "#4ade80" }} />
            <div>
              <p className="text-xs" style={{ color: "#7aa8d8" }}>ميزانية الشرطة</p>
              <p className="font-black text-lg" style={{ color: "#4ade80" }}>${budget.toLocaleString()}</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {catalogData?.vehicles?.map(v => {
            const canAfford = budget >= v.price;
            return (
              <Card
                key={v.key}
                className="border-border bg-card/50 overflow-hidden flex flex-col"
                style={{ borderColor: canAfford ? "rgba(50,100,200,0.35)" : "rgba(100,100,100,0.2)" }}
              >
                <div className="h-44 overflow-hidden bg-black/30 relative">
                  <img
                    src={v.image}
                    alt={v.nameAr}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center opacity-20"><svg xmlns='http://www.w3.org/2000/svg' class='w-16 h-16' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 6H5l-1 4h14l-1-4H13zM5 10l-1 4h16l-1-4H5z'/></svg></div>`;
                    }}
                  />
                  <Badge
                    className="absolute top-2 left-2 text-xs font-black"
                    style={{
                      background: canAfford ? "rgba(30,80,180,0.9)" : "rgba(100,100,100,0.9)",
                      color: canAfford ? "#7dd3fc" : "#94a3b8",
                      borderColor: "transparent",
                    }}
                  >
                    ${v.price.toLocaleString()}
                  </Badge>
                </div>
                <CardContent className="p-4 flex flex-col flex-1">
                  <h3 className="font-black text-sm mb-1" style={{ color: "#e0eeff" }}>{v.nameAr}</h3>
                  <p className="text-xs mb-3 flex-1" style={{ color: "#64748b" }}>{v.descAr}</p>
                  <Button
                    className="w-full font-bold text-sm"
                    style={{
                      background: canAfford ? "#1e50b4" : "#374151",
                      cursor: canAfford ? "pointer" : "not-allowed",
                    }}
                    disabled={!canAfford}
                    onClick={() => handleBuy(v)}
                  >
                    <ShoppingCart className="w-4 h-4 ml-1" />
                    {canAfford ? "شراء وتسليم" : "ميزانية غير كافية"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Assign Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] rounded-xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                تسليم السيارة
              </DialogTitle>
            </DialogHeader>
            {selectedVehicle && (
              <div className="space-y-4">
                <div className="rounded-lg p-4 text-center" style={{ background: "rgba(30,50,100,0.4)", border: "1px solid rgba(77,166,255,0.2)" }}>
                  <p className="font-black text-white">{selectedVehicle.nameAr}</p>
                  <p className="text-sm mt-1 font-bold" style={{ color: "#f87171" }}>
                    السعر: ${selectedVehicle.price.toLocaleString()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#7aa8d8" }}>
                    الميزانية بعد الشراء: ${(budget - selectedVehicle.price).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: "#7aa8d8" }}>
                    <User className="w-4 h-4 inline ml-1" />
                    اختر الفرد:
                  </p>
                  <Select value={selectedSoldierId} onValueChange={setSelectedSoldierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفرد..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(soldiersData as any)?.soldiers?.map((s: Soldier) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.rank} / {s.name}
                        </SelectItem>
                      )) ?? (Array.isArray(soldiersData) ? (soldiersData as Soldier[]).map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.rank} / {s.name}
                        </SelectItem>
                      )) : null)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 font-bold"
                    style={{ background: "#1e50b4" }}
                    onClick={handleConfirm}
                    disabled={!selectedSoldierId || assignMutation.isPending}
                  >
                    {assignMutation.isPending ? "جاري التنفيذ..." : "تأكيد الشراء والتسليم"}
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
