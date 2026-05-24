import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Landmark, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

function proxyImg(username: string | null | undefined): string {
  if (!username) return "";
  return `${BASE}/api/proxy/roblox-avatar?username=${encodeURIComponent(username)}`;
}

export default function BankSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BankResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

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
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    try {
      const res = await fetch(`${BASE}/api/bank/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل البحث");
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      toast({ title: "خطأ", description: "فشل البحث عن الحساب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (s: Suggestion) => {
    setQuery(s.char_name);
    setShowSuggestions(false);
    handleSearch(s.char_name);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "#4da6ff" }}>
            البحث البنكي
          </h2>
          <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
            ابحث عن حساب بنكي باسم الشخصية أو يوزر ديسكورد أو يوزر روبلوكس
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  ref={inputRef}
                  className="pr-10"
                  placeholder="اسم الشخصية / يوزر ديسكورد / روبلوكس..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSearch(); if (e.key === "Escape") setShowSuggestions(false); }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  dir="rtl"
                  autoComplete="off"
                />
                {suggestionsLoading && query.length >= 3 && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
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
                          <div className="w-8 h-8 rounded-md overflow-hidden shrink-0" style={{ border: "1px solid rgba(77,166,255,0.3)" }}>
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
              <Button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                style={{ background: "#1e50b4" }}
                className="hover:opacity-90 font-bold"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            {query.length >= 3 && !showSuggestions && (
              <p className="text-xs mt-2" style={{ color: "rgba(120,150,190,0.7)" }}>
                اضغط Enter أو زر البحث للحصول على نتائج كاملة
              </p>
            )}
          </CardContent>
        </Card>

        {searched && !loading && results.length === 0 && (
          <Card className="border-border bg-card/50" style={{ borderColor: "rgba(50,100,200,0.2)" }}>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>لا يوجد حساب بنكي مطابق</p>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map(r => (
              <Card key={r.discord_user_id} className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#86efac" }}>
                    <Landmark className="w-5 h-5" />
                    {r.char_name ?? "مستخدم ديسكورد"}
                    {r.character_id && (
                      <Badge className="mr-auto text-xs" style={{ background: "rgba(77,166,255,0.15)", color: "#7dd3fc", borderColor: "rgba(77,166,255,0.3)" }}>
                        #{r.character_id}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="rounded-xl p-5 text-center"
                    style={{ background: "linear-gradient(135deg, #0a2040 0%, #1a3a6a 100%)", border: "1px solid rgba(77,166,255,0.3)" }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: "#7aa8d8" }}>الرصيد الحالي</p>
                    <p className="text-4xl font-black" style={{ color: "#4da6ff" }}>
                      ${r.balance.toLocaleString()}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {r.discord_username && (
                      <div className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                        <User className="w-4 h-4 shrink-0" />
                        <span className="font-medium text-white/70">ديسكورد:</span>
                        <code className="text-xs" style={{ color: "#c4b5fd" }}>@{r.discord_username}</code>
                      </div>
                    )}
                    {r.roblox_username && (
                      <div className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                        <User className="w-4 h-4 shrink-0" />
                        <span className="font-medium text-white/70">روبلوكس:</span>
                        <span style={{ color: "#86efac" }}>{r.roblox_username}</span>
                      </div>
                    )}
                    {r.last_salary && (
                      <div className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="font-medium text-white/70">آخر راتب:</span>
                        <span style={{ color: "#fbbf24" }}>
                          {new Date(r.last_salary).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
