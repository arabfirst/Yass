import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Lock, User, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(1, { message: "اسم المستخدم مطلوب" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

export default function Login() {
  const { login, isLoggingIn } = useAuth();
  const [focused, setFocused] = useState<string | null>(null);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login(data);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
      style={{ background: "#0f172a" }}
    >
      {/* Ambient glow top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Horizontal scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)" }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-sm space-y-5"
      >
        {/* Logo card */}
        <div
          className="rounded-2xl p-6 flex flex-col items-center text-center space-y-3"
          style={{
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(56,189,248,0.15)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 60px rgba(56,189,248,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(15,30,60,0.8)",
              border: "2px solid rgba(56,189,248,0.25)",
              boxShadow: "0 0 20px rgba(56,189,248,0.12)",
            }}
          >
            <img src="/police-logo.png" alt="شعار الشرطة" className="w-14 h-14 object-contain" />
          </motion.div>
          <div>
            <h1
              className="text-lg font-black tracking-tight uppercase"
              style={{ color: "#38bdf8", textShadow: "0 0 20px rgba(56,189,248,0.4)" }}
            >
              ARAB FIRST Police Department
            </h1>
            <p className="text-xs mt-1 font-medium tracking-widest uppercase" style={{ color: "#475569" }}>
              نظام إدارة الأفراد المتطور
            </p>
          </div>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(56,189,248,0.12)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 4px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#64748b" }}>
                تسجيل دخول
              </span>
            </div>
            <Lock className="w-4 h-4" style={{ color: "#38bdf8" }} />
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider"
                style={{ color: focused === "username" ? "#38bdf8" : "#64748b" }}
              >
                <User className="w-3 h-3" />
                اسم المستخدم
              </Label>
              <Input
                id="username"
                data-testid="input-username"
                {...form.register("username")}
                placeholder="أدخل رقمك العسكري"
                onFocus={() => setFocused("username")}
                onBlur={() => setFocused(null)}
                className="h-11 text-sm font-medium transition-all duration-200"
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: focused === "username"
                    ? "1px solid rgba(56,189,248,0.6)"
                    : "1px solid rgba(56,189,248,0.12)",
                  color: "#e2e8f0",
                  boxShadow: focused === "username" ? "0 0 0 3px rgba(56,189,248,0.08)" : "none",
                }}
                autoComplete="username"
              />
              {form.formState.errors.username && (
                <p className="text-xs text-red-400">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider"
                style={{ color: focused === "password" ? "#38bdf8" : "#64748b" }}
              >
                <Lock className="w-3 h-3" />
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                {...form.register("password")}
                placeholder="••••••••"
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                className="h-11 text-sm font-medium transition-all duration-200"
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: focused === "password"
                    ? "1px solid rgba(56,189,248,0.6)"
                    : "1px solid rgba(56,189,248,0.12)",
                  color: "#e2e8f0",
                  boxShadow: focused === "password" ? "0 0 0 3px rgba(56,189,248,0.08)" : "none",
                }}
                autoComplete="current-password"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
              )}
            </div>

            <motion.button
              type="submit"
              data-testid="button-submit"
              disabled={isLoggingIn}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full h-11 rounded-lg font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                color: "#fff",
                boxShadow: "0 0 24px rgba(14,165,233,0.3), 0 2px 8px rgba(0,0,0,0.4)",
                border: "1px solid rgba(56,189,248,0.3)",
              }}
            >
              {isLoggingIn ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  دخول النظام
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: "#1e293b" }}>
          AFPD Command System v2.0
        </p>
      </motion.div>
    </div>
  );
}
