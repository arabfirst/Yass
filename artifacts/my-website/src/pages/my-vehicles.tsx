import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Calendar, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

export default function MyVehicles() {
  const { data, isLoading } = useQuery<{ vehicles: SoldierVehicle[] }>({
    queryKey: ["my-vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/police-vehicles/my");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>
            سياراتي العسكرية
          </h2>
          <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
            السيارات المخصصة لك من طرف القيادة
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : !data?.vehicles?.length ? (
          <Card className="border-border bg-card/50" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
            <CardContent className="py-16 text-center">
              <Car className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">لم تُخصص لك أي سيارة بعد</p>
              <p className="text-xs mt-1" style={{ color: "#475569" }}>تواصل مع القيادة لطلب سيارة</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.vehicles.map(v => (
              <Card key={v.id} className="border-border bg-card/50 overflow-hidden" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
                {v.vehicleImage && (
                  <div className="h-40 overflow-hidden bg-black/20">
                    <img
                      src={v.vehicleImage}
                      alt={v.vehicleName}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-black text-base" style={{ color: "#e0eeff" }}>{v.vehicleName}</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2" style={{ color: "#7aa8d8" }}>
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>من القيادة:</span>
                      <span className="font-semibold" style={{ color: "#c4b5fd" }}>{v.assignedBy}</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: "#7aa8d8" }}>
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>تاريخ التسليم:</span>
                      <span style={{ color: "#fbbf24" }}>{new Date(v.assignedAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                  <Badge
                    className="w-full justify-center text-xs font-bold"
                    style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", borderColor: "rgba(74,222,128,0.3)" }}
                  >
                    مخصصة لك ✓
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
