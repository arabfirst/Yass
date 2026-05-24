import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Users, PlusCircle, Home as HomeIcon,
  AlertTriangle, List, Menu, X, Search, Star, Settings, Radar,
  Landmark, ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
};

const LIEUTENANT_RANK_INDEX = 7;
const RANK_ORDER = [
  "Cadet", "Officer 1", "Officer 2", "Officer 3",
  "Sergeant 1", "Sergeant 2", "Sergeant 3",
  "Lieutenant", "First Lieutenant", "Captain", "Major",
  "Lieutenant Colonel", "Colonel", "Brigadier General",
  "Major General", "Lieutenant General", "General",
  "Deputy Commander", "High Commander", "Chief of Marshal", "Police Chief",
  "Minister of Interior",
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [user, isLoading, location, setLocation]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/police-logo.png" alt="شعار" className="w-16 h-16 opacity-60 animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const soldierRank = (user as any).rank as string | undefined;
  const rankIdx = soldierRank ? RANK_ORDER.indexOf(soldierRank) : -1;
  const isLieutenantPlus = isAdmin || rankIdx >= LIEUTENANT_RANK_INDEX;

  const adminNav: NavItem[] = [
    { href: "/", label: "الرئيسية", icon: <HomeIcon className="w-5 h-5" />, color: "#7dd3fc" },
    { href: "/soldiers", label: "إدارة الأفراد", icon: <Settings className="w-5 h-5" />, color: "#86efac" },
    { href: "/soldiers/new", label: "إضافة فرد", icon: <PlusCircle className="w-5 h-5" />, color: "#c4b5fd" },
    { href: "/citizen-search", label: "البحث", icon: <Search className="w-5 h-5" />, color: "#fda4af" },
    { href: "/bank-search", label: "البنك", icon: <Landmark className="w-5 h-5" />, color: "#4ade80" },
    { href: "/police-budget", label: "ميزانية الشرطة", icon: <Landmark className="w-5 h-5" />, color: "#fbbf24" },
    { href: "/seizure", label: "مصادرة الأموال", icon: <ShieldOff className="w-5 h-5" />, color: "#f87171" },
    { href: "/points", label: "النقاط", icon: <Star className="w-5 h-5" />, color: "#fbbf24" },
    { href: "/radar", label: "رادار العساكر", icon: <Radar className="w-5 h-5" />, color: "#4dd27a" },
    { href: "/warnings", label: "التحذيرات", icon: <AlertTriangle className="w-5 h-5" />, color: "#fb923c" },
    { href: "/activity-logs", label: "السجل", icon: <List className="w-5 h-5" />, color: "#94a3b8" },
  ];

  const soldierNav: NavItem[] = [
    { href: "/", label: "الرئيسية", icon: <HomeIcon className="w-5 h-5" />, color: "#7dd3fc" },
    { href: "/soldier-dashboard", label: "لوحتي", icon: <Users className="w-5 h-5" />, color: "#86efac" },
    { href: "/citizen-search", label: "البحث", icon: <Search className="w-5 h-5" />, color: "#fda4af" },
    { href: "/bank-search", label: "البنك", icon: <Landmark className="w-5 h-5" />, color: "#4ade80" },
    { href: "/points", label: "النقاط", icon: <Star className="w-5 h-5" />, color: "#fbbf24" },
    { href: "/radar", label: "رادار العساكر", icon: <Radar className="w-5 h-5" />, color: "#4dd27a" },
    ...(isLieutenantPlus ? [
      { href: "/police-budget", label: "ميزانية الشرطة", icon: <Landmark className="w-5 h-5" />, color: "#fbbf24" },
      { href: "/seizure", label: "مصادرة الأموال", icon: <ShieldOff className="w-5 h-5" />, color: "#f87171" },
    ] : []),
  ];

  const navItems = isAdmin ? adminNav : soldierNav;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans" dir="rtl"
      style={{
        background: "radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)",
      }}>

      {/* ── Header ───────────────────────────────────── */}
      <header
        className="h-16 md:h-18 border-b flex items-center justify-between px-4 md:px-8 z-30 shrink-0 sticky top-0 backdrop-blur-md"
        style={{
          background: "rgba(15, 23, 42, 0.8)",
          borderColor: "rgba(56, 189, 248, 0.15)",
        }}
      >
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <img src="/police-logo.png" alt="شعار" className="w-10 h-10 object-contain shrink-0 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
          </motion.div>
          <h1 className="font-black tracking-tight uppercase leading-tight text-base md:text-lg">
            <span className="hidden sm:inline" style={{ color: "#38bdf8", textShadow: "0 0 12px rgba(56,189,248,0.4)" }}>ARAB FIRST Police</span>
            <span className="sm:hidden" style={{ color: "#38bdf8" }}>AFPD</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-white">{user.username}</span>
            <span className="text-xs tracking-wider uppercase" style={{ color: "#0ea5e9" }}>{user.role === "admin" ? "قيادة عليا" : "فرد أمن"}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => logout()} title="تسجيل خروج"
            className="hidden md:flex border-slate-700 hover:bg-slate-800 hover:text-white hover:border-red-500/50 transition-all duration-300"
            style={{ color: "#94a3b8" }}>
            <LogOut className="w-4 h-4" />
          </Button>
          <button
            className="md:hidden p-2 rounded-md transition-colors"
            style={{ color: "#38bdf8" }}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="القائمة"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ── Mobile drop-down menu ─────────────────────── */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/70"
          onClick={() => setMenuOpen(false)}
        >
          <nav
            className="absolute top-14 right-0 left-0 shadow-2xl overflow-y-auto max-h-[calc(100dvh-3.5rem)]"
            style={{ background: "rgba(6,12,30,0.97)", borderBottom: "1px solid rgba(50,100,200,0.25)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(50,100,200,0.2)" }}>
              <div>
                <p className="font-semibold text-sm text-white">{user.username}</p>
                <p className="text-xs" style={{ color: "#7aa8d8" }}>{user.role === "admin" ? "مدير" : "عسكري"}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => logout()} className="gap-1 text-xs">
                <LogOut className="w-3 h-3" />
                خروج
              </Button>
            </div>
            <div className="p-2 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-semibold`}
                  style={{
                    background: location === item.href ? "rgba(30,80,180,0.4)" : "transparent",
                    color: location === item.href ? (item.color || "#7dd3fc") : "rgba(150,170,200,0.8)",
                    borderLeft: location === item.href ? `3px solid ${item.color || "#4da6ff"}` : "3px solid transparent",
                  }}
                >
                  <span style={{ color: item.color }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex w-64 flex-col shrink-0"
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            borderLeft: "1px solid rgba(56, 189, 248, 0.1)",
          }}
        >
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map(item => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm overflow-hidden"
                  style={{
                    color: isActive ? "#ffffff" : "rgba(148, 163, 184, 0.9)",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 opacity-20"
                      style={{ background: item.color || "#38bdf8" }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeBorder"
                      className="absolute right-0 top-0 bottom-0 w-1 rounded-r-lg"
                      style={{ background: item.color || "#38bdf8", boxShadow: `0 0 10px ${item.color || "#38bdf8"}` }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 transition-transform duration-200 group-hover:scale-110" style={{ color: isActive ? item.color : "inherit" }}>
                    {item.icon}
                  </span>
                  <span className="relative z-10 tracking-wide">{item.label}</span>
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex justify-around items-center py-1"
        style={{
          background: "rgba(6,12,30,0.97)",
          borderTop: "1px solid rgba(50,100,200,0.25)",
          backdropFilter: "blur(12px)",
        }}
      >
        {navItems.slice(0, 5).map(item => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors`}
              style={{ color: active ? (item.color || "#4da6ff") : "rgba(130,155,185,0.8)" }}
            >
              {item.icon}
              <span className="text-[9px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
