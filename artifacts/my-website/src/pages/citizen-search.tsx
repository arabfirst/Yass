import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, MapPin, Globe, Calendar, Shield, Hash, MessageCircle } from "lucide-react";

interface CharacterResult {
  character_id: string;
  char_name: string;
  char_age: string;
  char_nationality: string;
  char_gender: string;
  char_address: string;
  roblox_username: string;
  discord_username: string | null;
  headshot_url: string;
}

interface Suggestion {
  character_id: string;
  char_name: string;
  roblox_username: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function proxyImg(username: string | null | undefined): string {
  if (!username) return "";
  return `${BASE}/api/proxy/roblox-avatar?username=${encodeURIComponent(username)}`;
}

async function searchCharacters(query: string): Promise<CharacterResult[]> {
  const res = await fetch(`${BASE}/api/characters/search?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (query.trim().length < 2) return [];
  const res = await fetch(`${BASE}/api/characters/suggestions?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions || [];
}

export default function CitizenSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CharacterResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<CharacterResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      const data = await fetchSuggestions(query.trim());
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
      setSuggestionsLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setSelected(null);
    setShowSuggestions(false);
    try {
      const data = await searchCharacters(query.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowSuggestions(false);
  };

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setQuery(suggestion.char_name);
    setShowSuggestions(false);
    setLoading(true);
    setSearched(true);
    setSelected(null);
    try {
      const data = await searchCharacters(suggestion.char_name);
      const exact = data.find(r => r.character_id === suggestion.character_id) || data[0];
      if (exact) {
        setSelected(exact);
      } else {
        setResults(data);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto" dir="rtl">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: "#4da6ff" }}>
            البحث عن المواطنين
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            ابحث برقم الهوية أو اسم الشخصية
          </p>
        </div>

        {/* Search bar */}
        <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
          <CardContent className="pt-6">
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="أدخل رقم الهوية أو اسم الشخصية..."
                    className="h-12 text-base"
                    style={{
                      background: "rgba(10,20,50,0.8)",
                      border: "1px solid rgba(60,110,200,0.3)",
                      color: "#e0eeff",
                    }}
                    autoComplete="off"
                  />

                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
                      style={{
                        background: "rgba(6,12,35,0.98)",
                        border: "1px solid rgba(60,110,200,0.4)",
                        top: "100%",
                      }}
                    >
                      <div className="p-1.5 space-y-0.5">
                        {suggestions.map(s => (
                          <button
                            key={s.character_id}
                            onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-right"
                          >
                            <div
                              className="w-8 h-8 rounded-md overflow-hidden shrink-0"
                              style={{ border: "1px solid rgba(212,175,55,0.3)" }}
                            >
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
                            </div>
                            <span className="text-xs font-mono shrink-0" style={{ color: "#fbbf24" }}>
                              #{s.character_id}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {suggestionsLoading && query.length >= 2 && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin block" />
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="h-12 px-6 font-bold shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #1558e0 0%, #0035aa 100%)",
                    boxShadow: "0 0 15px rgba(30,100,255,0.4)",
                    border: "1px solid rgba(100,160,255,0.4)",
                  }}
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {query.length >= 2 && (
                <p className="text-xs mt-2" style={{ color: "rgba(120,150,190,0.7)" }}>
                  اضغط Enter أو زر البحث للحصول على نتائج كاملة
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ID Card display */}
        {selected && (
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #08123a 0%, #0d1c4a 50%, #060e28 100%)",
              border: "2px solid rgba(212,175,55,0.6)",
              boxShadow: "0 0 40px rgba(212,175,55,0.15), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {[
              "top-0 right-0", "top-0 left-0", "bottom-0 right-0", "bottom-0 left-0"
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} w-8 h-8`}
                style={{
                  borderTop: i < 2 ? "3px solid rgba(212,175,55,0.8)" : "none",
                  borderBottom: i >= 2 ? "3px solid rgba(212,175,55,0.8)" : "none",
                  borderRight: i % 2 === 0 ? "3px solid rgba(212,175,55,0.8)" : "none",
                  borderLeft: i % 2 === 1 ? "3px solid rgba(212,175,55,0.8)" : "none",
                }}
              />
            ))}

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-28 h-28 rounded-lg overflow-hidden"
                  style={{ border: "2px solid rgba(212,175,55,0.6)" }}
                >
                  {selected.roblox_username ? (
                    <img
                      src={proxyImg(selected.roblox_username)}
                      alt={selected.char_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(20,30,80,0.8)" }}>
                      <User className="w-12 h-12 text-yellow-500/50" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-mono" style={{ color: "rgba(180,180,200,0.8)" }}>
                  @{selected.roblox_username}
                </p>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.7)" }}>
                    ARAB FIRST ROLEPLAY · هوية رسمية
                  </p>
                  <h3 className="text-2xl font-black text-white mt-1">{selected.char_name}</h3>
                </div>

                <div className="w-full h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.8), transparent)" }} />

                <div className="grid grid-cols-2 gap-3">
                  <InfoRow icon={<Calendar className="w-4 h-4" />} label="العمر" value={selected.char_age} color="#7dd3fc" />
                  <InfoRow icon={<Globe className="w-4 h-4" />} label="الجنسية" value={selected.char_nationality} color="#86efac" />
                  <InfoRow icon={<User className="w-4 h-4" />} label="الجنس" value={selected.char_gender} color="#c4b5fd" />
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="العنوان" value={selected.char_address} color="#fda4af" />
                  {selected.discord_username && (
                    <InfoRow icon={<MessageCircle className="w-4 h-4" />} label="يوزر ديسكورد" value={`@${selected.discord_username}`} color="#a5b4fc" />
                  )}
                </div>

                <div
                  className="rounded-lg px-4 py-2 flex items-center justify-between"
                  style={{ background: "rgba(10,20,50,0.6)", border: "1px solid rgba(212,175,55,0.3)" }}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs" style={{ color: "rgba(180,180,200,0.7)" }}>رقم الهوية:</span>
                  </div>
                  <span className="text-xl font-black font-mono" style={{ color: "#fbbf24" }}>
                    {selected.character_id}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 left-3 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Results */}
        {searched && !selected && (
          <Card className="border-border bg-card/50 backdrop-blur" style={{ borderColor: "rgba(50,100,200,0.3)" }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#7dd3fc" }}>
                <Shield className="w-5 h-5" />
                نتائج البحث
                {results.length > 0 && (
                  <Badge className="mr-auto text-xs" style={{ background: "rgba(30,80,180,0.4)", color: "#93c5fd" }}>
                    {results.length} نتيجة
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-2" />
                  جاري البحث...
                </div>
              ) : results.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  لم يتم العثور على نتائج
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {results.map(r => (
                    <button
                      key={r.character_id}
                      onClick={() => setSelected(r)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors text-right"
                    >
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                        style={{ border: "1px solid rgba(212,175,55,0.4)" }}
                      >
                        {r.roblox_username ? (
                          <img src={proxyImg(r.roblox_username)} alt={r.char_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white">{r.char_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.char_nationality} · {r.char_age} سنة
                        </p>
                      </div>
                      <div className="text-xs font-mono shrink-0" style={{ color: "#fbbf24" }}>
                        #{r.character_id}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function InfoRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5" style={{ color: "rgba(150,170,200,0.8)" }}>
        <span style={{ color }}>{icon}</span>
        <span className="text-xs">{label}:</span>
      </div>
      <p className="font-bold text-sm text-white pr-5">{value || "غير محدد"}</p>
    </div>
  );
}
