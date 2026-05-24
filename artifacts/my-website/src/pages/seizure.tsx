import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldOff, Landmark, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type BankResult = {
  discord_user_id: string;
  discord_username: string | null;
  balance: number;
  last_salary: string | null;
  char_name: string | null;
  character_id: string | null;
  roblox_username: string | null;
};

type Suggestion = {
  character_id: string;
  char_name: string;
  roblox_username: string | null;
  discord_username: string | null;
  user_id: string | null;
  balance: number | null;
};

type SeizureLog = {
  id: number;
  targetDiscordUserId: string;
  targetName: string;
  amount: number;
  officerName: string;
  note: string | null;
  createdAt: string;
};

function proxyImg(username: string | null | undefined): string {
  if (!username) return "";
  return `${BASE}/api/proxy/roblox-avatar?username=${encodeURIComponent(username)}`;
}

export default function Seizure() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BankResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<BankResult | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [seizing, setSeizing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logsData } = useQuery<{ logs: SeizureLog[] }>({
    queryKey: ["seizure-logs"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/seizure/logs`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const res = await fetch(`${BASE}/api/bank/suggestions?q=${encodeURIComponent(query.trim())}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions((data.suggestions || []).length > 0);
      } catch { /* ignore */ } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    setSelected(null);
    setShowSuggestions(false);
    try {
      const res = await fetch(`${BASE}/api/bank/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل");
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      toast({ title: "خطأ في البحث", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = (s: Suggestion) => {
    setQuery(s.char_name);
    setShowSuggestions(false);
    handleSearch(s.char_name);
  };

  const handleSeize = async () => {
    if (!selected) return;
    const amt = parseInt(amount.replace(/,/g, ""));
    if (!amt || amt <= 0) return toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });

    setSeizing(true);
    try {
      const res = await fetch(`${BASE}/api/seizure/seize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetDiscordUserId: selected.discord_user_id,
          targetName: selected.char_name ?? selected.discord_user_id,
          amount: amt,
          note: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `تم المصادرة — الرصيد الجديد: $${data.newBalance?.toLocaleString()}` });
      setSelected(null);
      setAmount("");
      setNote("");
      setResults([]);
      setQuery("");
      setSearched(false);
      queryClient.invalidateQueries({ queryKey: ["seizure-logs"] });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSeizing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>
            مصادرة الأموال
          </h2>
          <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
            البحث عن حساب وسحب الأموال بصلاحية الضباط
          </p>
        </div>

        {/* Search */}
        <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#7dd3fc" }}>
              <Search className="w-4 h-4" />
              البحث عن حساب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  className="flex-1 w-full"
                  placeholder="اسم الشخصية / يوزر ديسكورد / روبلوكس..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSearch(); if (e.key === "Escape") setShowSuggestions(false); }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  dir="rtl"
                  autoComplete="off"
                />
                {suggestionsLoading && query.length >= 3 && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin block" />
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: "rgba(6,12,35,0.98)", border: "1px solid rgba(60,110,200,0.4)", top: "100%" }}
                  >
                    <div className="p-1.5 space-y-0.5">
                      {suggestions.map(s => (
                        <button
                          key={s.character_id}
                          onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-right"
                        >
                          <div className="w-8 h-8 rounded-md overflow-hidden shrink-0" style={{ border: "1px solid rgba(248,113,113,0.3)" }}>
                            {s.roblox_username ? (
                              <img src={proxyImg(s.roblox_username)} alt={s.char_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="font-bold text-sm text-white truncate">{s.char_name}</p>
                            {s.discord_username && (
                              <p className="text-xs truncate" style={{ color: "#a5b4fc" }}>@{s.discord_username}</p>
                            )}
                          </div>
                          {s.balance !== null && (
                            <span className="text-sm font-black shrink-0" style={{ color: "#4ade80" }}>
                              ${s.balance.toLocaleString()}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={() => handleSearch()} disabled={searching || !query.trim()} style={{ background: "#1e50b4" }} className="hover:opacity-90 shrink-0">
                {searching ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {searched && !searching && results.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-4">لا يوجد نتائج</p>
            )}

            {results.length > 0 && !selected && (
              <div className="mt-4 space-y-2">
                {results.map(r => (
                  <button
                    key={r.discord_user_id}
                    onClick={() => setSelected(r)}
                    className="w-full text-right px-4 py-3 rounded-lg border transition-all"
                    style={{
                      background: "rgba(10,20,40,0.6)",
                      borderColor: "rgba(50,100,200,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-white">{r.char_name ?? "مجهول"}</p>
                        <p className="text-xs" style={{ color: "#7aa8d8" }}>
                          {r.character_id && `هوية: ${r.character_id} • `}{r.discord_username ? `@${r.discord_username}` : (r.roblox_username ?? "")}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm" style={{ color: "#4ade80" }}>${r.balance.toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seizure Form */}
        {selected && (
          <Card className="border-border bg-card/50" style={{ borderColor: "rgba(248,113,113,0.4)" }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#f87171" }}>
                <ShieldOff className="w-5 h-5" />
                مصادرة من: {selected.char_name ?? selected.discord_user_id}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                <p className="text-xs mb-1" style={{ color: "#7aa8d8" }}>الرصيد المتاح</p>
                <p className="text-2xl font-black" style={{ color: "#4ade80" }}>${selected.balance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs mb-1 font-semibold" style={{ color: "#7aa8d8" }}>المبلغ المراد مصادرته ($)</p>
                <Input
                  placeholder="مثال: 10000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  type="number"
                  min="1"
                  max={selected.balance}
                  dir="ltr"
                />
              </div>
              <div>
                <p className="text-xs mb-1 font-semibold" style={{ color: "#7aa8d8" }}>سبب المصادرة (اختياري)</p>
                <Input
                  placeholder="سبب المصادرة..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1 font-bold"
                  onClick={handleSeize}
                  disabled={seizing || !amount}
                >
                  {seizing ? "جاري التنفيذ..." : "تأكيد المصادرة"}
                </Button>
                <Button variant="outline" onClick={() => { setSelected(null); setAmount(""); setNote(""); }}>
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs */}
        <Card className="border-border bg-card/50" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#c4b5fd" }}>
              <Clock className="w-5 h-5" />
              سجل المصادرات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!logsData?.logs?.length ? (
              <div className="py-10 text-center text-muted-foreground text-sm">لا يوجد مصادرات</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(50,100,200,0.12)" }}>
                {logsData.logs.map(l => (
                  <div key={l.id} className="flex items-center gap-4 px-4 py-3">
                    <ShieldOff className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-bold text-sm text-white">{l.targetName}</span>
                        <span className="text-xs" style={{ color: "#7aa8d8" }}>بواسطة {l.officerName}</span>
                      </div>
                      {l.note && <p className="text-xs mt-0.5 truncate" style={{ color: "#64748b" }}>{l.note}</p>}
                    </div>
                    <div className="text-left shrink-0">
                      <p className="font-black text-sm" style={{ color: "#f87171" }}>-${l.amount.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: "#475569" }}>{new Date(l.createdAt).toLocaleDateString("ar-SA")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
