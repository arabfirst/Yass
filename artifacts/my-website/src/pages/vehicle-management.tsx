import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Trash2, User, Calendar, Landmark, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type SoldierVehicle = {
  id: number;
  soldierId: number;
  soldierName: string;
  robloxUsername: string | null;
  vehicleKey: string;
  vehicleName: string;
  vehicleImage: string | null;
  pricePaid: number;
  assignedBy: string;
  assignedAt: string;
};

export default function VehicleManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revokeTarget, setRevokeTarget] = useState<SoldierVehicle | null>(null);

  const { data, isLoading } = useQuery<{ vehicles: SoldierVehicle[] }>({
    queryKey: ["police-vehicles-all"],
    queryFn: async () => {
      const res = await fetch("/api/police-vehicles/all");
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

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/police-vehicles/${id}/revoke`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      toast({ title: `تم سحب السيارة — تم إرجاع $${d.refunded?.toLocaleString()} للميزانية` });
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ["police-vehicles-all"] });
      queryClient.invalidateQueries({ queryKey: ["police-budget"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Group by soldier
  const grouped = (data?.vehicles ?? []).reduce<Record<number, { name: string; vehicles: SoldierVehicle[] }>>((acc, v) => {
    if (!acc[v.soldierId]) acc[v.soldierId] = { name: v.soldierName, vehicles: [] };
    acc[v.soldierId].vehicles.push(v);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>
              إدارة السيارات
            </h2>
            <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
              جميع السيارات المخصصة للأفراد
            </p>
          </div>
          <Card className="border-border bg-card/50 px-5 py-3 flex items-center gap-3" style={{ borderColor: "rgba(74,222,128,0.3)" }}>
            <Landmark className="w-5 h-5" style={{ color: "#4ade80" }} />
            <div>
              <p className="text-xs" style={{ color: "#7aa8d8" }}>ميزانية الشرطة</p>
              <p className="font-black text-lg" style={{ color: "#4ade80" }}>${(budgetData?.balance ?? 0).toLocaleString()}</p>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : !Object.keys(grouped).length ? (
          <Card className="border-border bg-card/50" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
            <CardContent className="py-16 text-center">
              <Car className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">لا يوجد سيارات مخصصة بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([soldierIdStr, group]) => (
              <Card key={soldierIdStr} className="border-border bg-card/50" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#86efac" }}>
                    <User className="w-5 h-5" />
                    {group.name}
                    <Badge className="mr-auto text-xs" style={{ background: "rgba(77,166,255,0.15)", color: "#7dd3fc", borderColor: "rgba(77,166,255,0.3)" }}>
                      {group.vehicles.length} سيارة
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y" style={{ borderColor: "rgba(50,100,200,0.12)" }}>
                    {group.vehicles.map(v => (
                      <div key={v.id} className="flex items-center gap-4 px-4 py-3">
                        {v.vehicleImage && (
                          <div className="w-14 h-10 rounded overflow-hidden bg-black/30 shrink-0">
                            <img
                              src={v.vehicleImage}
                              alt={v.vehicleName}
                              className="w-full h-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white">{v.vehicleName}</p>
                          <div className="flex flex-wrap gap-x-3 text-xs mt-0.5" style={{ color: "#7aa8d8" }}>
                            <span>
                              <Calendar className="w-3 h-3 inline ml-0.5" />
                              {new Date(v.assignedAt).toLocaleDateString("ar-SA")}
                            </span>
                            <span style={{ color: "#fbbf24" }}>${v.pricePaid.toLocaleString()}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => setRevokeTarget(v)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          سحب
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!revokeTarget} onOpenChange={open => !open && setRevokeTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              تأكيد سحب السيارة
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من سحب سيارة <strong style={{ color: "#e0eeff" }}>{revokeTarget?.vehicleName}</strong> من{" "}
              <strong style={{ color: "#86efac" }}>{revokeTarget?.soldierName}</strong>؟
              <br />
              سيتم إرجاع <strong style={{ color: "#4ade80" }}>${revokeTarget?.pricePaid?.toLocaleString()}</strong> للميزانية تلقائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "جاري التنفيذ..." : "تأكيد السحب"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
