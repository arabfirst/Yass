import { useEffect } from "react";
import { useListActivityLogs } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Clock } from "lucide-react";
import { format } from "date-fns";

export default function ActivityLogs() {
  const { data: logs, isLoading, refetch } = useListActivityLogs();

  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">سجل الأنشطة</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">سجل متكامل بجميع الحركات (تحديث كل 30 ثانية)</p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <List className="w-5 h-5 text-primary" />
              أحدث الحركات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center">جاري التحميل...</div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-border/50">
                  {logs?.map(log => (
                    <div key={log.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-primary">{log.action}</span>
                        <span className="text-xs font-semibold text-muted-foreground shrink-0">{log.performedBy}</span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground">{log.details}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground/60 font-mono">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm:ss")}
                      </div>
                    </div>
                  ))}
                  {logs?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">لا يوجد سجلات</p>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b [&_tr]:border-border/50">
                      <tr>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">الإجراء</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">المنفذ</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">التفاصيل</th>
                        <th className="h-11 px-4 text-right align-middle font-bold text-muted-foreground uppercase">الوقت</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {logs?.map((log) => (
                        <tr key={log.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-bold text-primary">{log.action}</td>
                          <td className="p-4 align-middle font-medium">{log.performedBy}</td>
                          <td className="p-4 align-middle text-muted-foreground">{log.details || "-"}</td>
                          <td className="p-4 align-middle font-mono text-xs opacity-70 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm:ss")}
                          </td>
                        </tr>
                      ))}
                      {logs?.length === 0 && (
                        <tr>
                          <td colSpan={4} className="h-24 text-center text-muted-foreground">لا يوجد سجلات</td>
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
