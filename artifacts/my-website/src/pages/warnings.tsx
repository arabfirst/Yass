import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListWarnings, 
  useDeleteWarning,
  useCreateWarning,
  useListSoldiers,
  getListWarningsQueryKey,
  getListSoldiersQueryKey
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Warnings() {
  const { data: warnings, isLoading: warningsLoading } = useListWarnings();
  const { data: soldiers } = useListSoldiers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useDeleteWarning({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWarningsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });
        toast({ title: "تم حذف التحذير بنجاح" });
      },
      onError: (err: any) => {
        toast({ title: "خطأ", description: err.error || "حدث خطأ أثناء الحذف", variant: "destructive" });
      }
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا التحذير؟")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-orange-500">التحذيرات</h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium">سجل المخالفات للأفراد</p>
          </div>
          <AddWarningDialog soldiers={soldiers || []} />
        </div>

        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-500 text-base md:text-lg">
              <AlertTriangle className="w-5 h-5" />
              قائمة التحذيرات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {warningsLoading ? (
              <div className="h-40 flex items-center justify-center">جاري التحميل...</div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-border/50">
                  {warnings?.map(warning => (
                    <div key={warning.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-orange-400">{warning.soldierName}</p>
                          <p className="text-sm text-foreground mt-0.5">{warning.reason}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="w-8 h-8 shrink-0"
                          onClick={() => handleDelete(warning.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>صادر من: {warning.givenBy}</span>
                        <span className="font-mono">{format(new Date(warning.createdAt), "yyyy/MM/dd")}</span>
                      </div>
                    </div>
                  ))}
                  {warnings?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">لا يوجد تحذيرات</p>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b [&_tr]:border-border/50">
                      <tr>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">اسم العسكري</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">السبب</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">صادر من</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">التاريخ</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {warnings?.map((warning) => (
                        <tr key={warning.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-bold">{warning.soldierName}</td>
                          <td className="p-4 align-middle font-medium">{warning.reason}</td>
                          <td className="p-4 align-middle text-muted-foreground">{warning.givenBy}</td>
                          <td className="p-4 align-middle font-mono text-xs opacity-70">{format(new Date(warning.createdAt), "yyyy/MM/dd HH:mm")}</td>
                          <td className="p-4 align-middle">
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(warning.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {warnings?.length === 0 && (
                        <tr>
                          <td colSpan={5} className="h-24 text-center text-muted-foreground">لا يوجد تحذيرات</td>
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

function AddWarningDialog({ soldiers }: { soldiers: any[] }) {
  const [open, setOpen] = useState(false);
  const [soldierId, setSoldierId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateWarning({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWarningsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSoldiersQueryKey() });
        toast({ title: "تم إضافة التحذير بنجاح" });
        setOpen(false);
        setSoldierId("");
        setReason("");
      },
      onError: (err: any) => {
        toast({ title: "خطأ", description: err.error || "حدث خطأ أثناء الإضافة", variant: "destructive" });
      }
    }
  });

  const handleSubmit = () => {
    if (!soldierId || !reason) return;
    createMutation.mutate({ data: { soldierId: parseInt(soldierId, 10), reason } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-10 px-4 shrink-0">
          <PlusCircle className="w-4 h-4 ml-2" />
          <span className="hidden sm:inline">إضافة تحذير</span>
          <span className="sm:hidden">إضافة</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] rounded-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <AlertTriangle className="w-5 h-5" />
            إصدار تحذير لعسكري
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>اختر العسكري</Label>
            <Select value={soldierId} onValueChange={setSoldierId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                {soldiers.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.rank} / {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>سبب التحذير</Label>
            <Textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="اكتب تفاصيل المخالفة هنا..."
              className="resize-none"
              rows={4}
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!soldierId || !reason || createMutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {createMutation.isPending ? "جاري الإصدار..." : "إصدار التحذير"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
