import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function DiscordSetup() {
  const [discordUsername, setDiscordUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { refetchUser } = useAuth();

  const handleSubmit = async () => {
    const val = discordUsername.trim();
    if (!val || val.length < 2) {
      toast({ title: "يوزر غير صالح", description: "أدخل يوزر ديسكورد صحيح", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/soldiers/discord-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ discordUsername: val }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل الحفظ");
      }
      await refetchUser();
      toast({ title: "تم الربط بنجاح", description: `تم ربط يوزر ديسكورد: ${val}` });
      setLocation("/soldier-dashboard");
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #020818 0%, #030d2e 50%, #020818 100%)" }}
    >
      <div className="w-full max-w-md space-y-6" dir="rtl">
        <div className="text-center space-y-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background: "linear-gradient(135deg, #5865f2 0%, #3b4bc8 100%)",
              boxShadow: "0 0 40px rgba(88,101,242,0.4)",
            }}
          >
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">ربط حساب ديسكورد</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(150,170,210,0.9)" }}>
              أدخل يوزر ديسكورد الخاص بك لربط حسابك البنكي
            </p>
          </div>
        </div>

        <Card
          style={{
            background: "rgba(8,16,50,0.8)",
            border: "1px solid rgba(88,101,242,0.4)",
            boxShadow: "0 0 40px rgba(88,101,242,0.1)",
          }}
        >
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold" style={{ color: "#a5b4fc" }}>
                يوزر ديسكورد
              </label>
              <div className="relative">
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
                  style={{ color: "#5865f2" }}
                >
                  @
                </span>
                <Input
                  className="pr-8 text-white font-mono"
                  placeholder="username"
                  value={discordUsername}
                  onChange={e => setDiscordUsername(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  dir="ltr"
                  style={{
                    background: "rgba(5,10,30,0.8)",
                    border: "1px solid rgba(88,101,242,0.4)",
                    color: "#e0eeff",
                  }}
                  autoFocus
                />
              </div>
              <p className="text-xs" style={{ color: "rgba(130,150,190,0.8)" }}>
                مثال: sultan_99 أو sultan#0001
              </p>
            </div>

            <Button
              className="w-full font-black text-base h-12"
              onClick={handleSubmit}
              disabled={loading || !discordUsername.trim()}
              style={{
                background: "linear-gradient(135deg, #5865f2 0%, #3b4bc8 100%)",
                boxShadow: "0 0 20px rgba(88,101,242,0.4)",
              }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4 ml-2" />
                  تأكيد وإكمال الدخول
                </>
              )}
            </Button>

            <p className="text-center text-xs" style={{ color: "rgba(100,120,160,0.7)" }}>
              يمكنك تغيير يوزر ديسكورد لاحقاً من لوحة التحكم
            </p>
          </CardContent>
        </Card>

        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.2)" }}
        >
          <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#5865f2" }} />
          <div className="text-xs space-y-1" style={{ color: "rgba(150,170,210,0.9)" }}>
            <p className="font-bold" style={{ color: "#a5b4fc" }}>لماذا نحتاج يوزر ديسكورد؟</p>
            <p>يتم ربط يوزر ديسكورد برصيدك البنكي داخل اللعبة، مما يتيح للقيادة الاطلاع على رصيدك وإدارة المعاملات المالية.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
