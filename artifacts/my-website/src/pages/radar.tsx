import { useEffect, useRef, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { Radar, RefreshCw, Wifi, WifiOff, AlertCircle, User } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Postal code → [x%, y%] positions on erlc-map.png (0 to 1)
// Measured directly from the map image
const POSTAL_POSITIONS: Record<string, [number, number]> = {
  // North (800s/900s)
  "806": [0.36, 0.05], "804": [0.32, 0.10], "805": [0.27, 0.18],
  "802": [0.33, 0.16], "803": [0.23, 0.22], "801": [0.39, 0.22],
  "900": [0.44, 0.12], "901": [0.50, 0.13], "902": [0.58, 0.16],
  "903": [0.49, 0.22], "904": [0.56, 0.22], "905": [0.64, 0.22],
  "906": [0.56, 0.27], "907": [0.56, 0.29], "908": [0.65, 0.28],
  "909": [0.52, 0.32], "910": [0.68, 0.31],
  // Far north-west (700s)
  "711": [0.20, 0.30], "710": [0.26, 0.31],
  "708": [0.16, 0.35], "709": [0.24, 0.35],
  "707": [0.32, 0.37], "706": [0.26, 0.41], "705": [0.21, 0.41],
  "704": [0.15, 0.41], "703": [0.32, 0.43], "702": [0.24, 0.47],
  "701": [0.19, 0.48], "700": [0.12, 0.40],
  // Center-west (400s)
  "412": [0.19, 0.50], "411": [0.26, 0.49],
  "410": [0.24, 0.52], "409": [0.20, 0.55], "408": [0.12, 0.53],
  "407": [0.28, 0.55], "406": [0.24, 0.56],
  "405": [0.20, 0.59], "404": [0.27, 0.61], "403": [0.25, 0.61],
  "402": [0.19, 0.62], "401": [0.14, 0.66], "400": [0.09, 0.67],
  // City center (600s)
  "604": [0.52, 0.43], "602": [0.40, 0.48], "601": [0.49, 0.48],
  "600": [0.45, 0.51],
  // Center (500s)
  "507": [0.57, 0.50], "506": [0.52, 0.51], "510": [0.65, 0.51],
  "505": [0.50, 0.54], "504": [0.47, 0.54], "501": [0.57, 0.54],
  "509": [0.62, 0.54], "503": [0.42, 0.55], "502": [0.37, 0.56],
  "511": [0.60, 0.62],
  // Center-south (300s)
  "308": [0.36, 0.64], "305": [0.40, 0.64], "309": [0.47, 0.67],
  "306": [0.38, 0.74], "303": [0.38, 0.78], "304": [0.44, 0.77],
  "307": [0.48, 0.75], "310": [0.54, 0.75], "311": [0.60, 0.78],
  "300": [0.39, 0.81], "301": [0.44, 0.82], "302": [0.50, 0.81],
  "314": [0.35, 0.87], "313": [0.42, 0.87], "312": [0.50, 0.86],
  // South-west (200s)
  "216": [0.20, 0.67], "217": [0.24, 0.68], "219": [0.30, 0.68],
  "210": [0.15, 0.74], "211": [0.19, 0.74], "212": [0.21, 0.74],
  "213": [0.24, 0.75], "218": [0.26, 0.74],
  "205": [0.15, 0.78], "206": [0.18, 0.78], "207": [0.20, 0.78],
  "208": [0.22, 0.78], "209": [0.26, 0.78],
  "200": [0.14, 0.84], "201": [0.17, 0.84], "202": [0.20, 0.84],
  "203": [0.23, 0.84], "204": [0.31, 0.84],
  "220": [0.14, 0.88], "221": [0.17, 0.88], "222": [0.19, 0.88],
  "225": [0.13, 0.90], "224": [0.09, 0.91], "223": [0.26, 0.91],
  // East (1100s)
  "1190": [0.73, 0.17], "1101": [0.78, 0.19],
  "1102": [0.75, 0.23], "1103": [0.84, 0.23],
  "1104": [0.75, 0.29], "1105": [0.80, 0.30], "1106": [0.85, 0.30],
  "1113": [0.68, 0.33], "1107": [0.72, 0.35], "1108": [0.81, 0.35],
  "1109": [0.89, 0.35], "1110": [0.71, 0.39], "1111": [0.84, 0.38],
  "1112": [0.68, 0.46], "1200": [0.83, 0.45],
  "1201": [0.82, 0.54], "1202": [0.85, 0.61],
  "1203": [0.85, 0.68], "1204": [0.82, 0.77],
  "1205": [0.87, 0.82], "1206": [0.87, 0.86], "1207": [0.74, 0.91],
};

type RadarPlayer = {
  soldierId: number;
  name: string;
  rank: string;
  unit: string;
  robloxUsername: string;
  x: number;
  z: number;
  postalCode: string;
  streetName: string;
  team: string;
  callsign: string;
};

type RadarData = {
  players: RadarPlayer[];
  total: number;
};

function getPlayerPosition(player: { postalCode: string }, W: number, H: number): [number, number] | null {
  const pos = POSTAL_POSITIONS[player.postalCode];
  if (!pos) return null;
  return [pos[0] * W, pos[1] * H];
}

const PLAYER_COLORS = [
  "#4dd27a", "#4da6ff", "#fbbf24", "#f87171",
  "#c4b5fd", "#fb923c", "#34d399", "#60a5fa",
];

export default function RadarPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [data, setData] = useState<RadarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [online, setOnline] = useState(false);
  const [hoveredPlayer, setHoveredPlayer] = useState<RadarPlayer | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the ERLC map image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${BASE}/maps/erlc-map.png`;
    img.onload = () => {
      mapImgRef.current = img;
      setMapLoaded(true);
    };
    img.onerror = () => {
      // If map image fails, still show radar without it
      setMapLoaded(true);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/radar/locations`, { credentials: "include" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "خطأ في الاتصال" }));
        setError(json.error ?? "خطأ في الاتصال بالسيرفر");
        setOnline(false);
        return;
      }
      const json: RadarData = await res.json();
      setData(json);
      setError(null);
      setOnline(true);
      setLastUpdate(new Date());
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  // Draw canvas whenever data or map image changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Draw ERLC map as background
    if (mapImgRef.current) {
      ctx.drawImage(mapImgRef.current, 0, 0, W, H);
      // Slight dark overlay for better dot visibility
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, W, H);
    } else {
      // Fallback: dark grid
      ctx.fillStyle = "rgba(4, 10, 30, 1)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(30, 80, 160, 0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath(); ctx.moveTo((i / 10) * W, 0); ctx.lineTo((i / 10) * W, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, (i / 10) * H); ctx.lineTo(W, (i / 10) * H); ctx.stroke();
      }
    }

    // Draw each soldier as a glowing dot
    if (data && data.players.length > 0) {
      data.players.forEach((player, idx) => {
        const pos = getPlayerPosition(player, W, H);
        if (!pos) return;
        const [px, py] = pos;
        const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];

        // Outer glow ring
        const grad = ctx.createRadialGradient(px, py, 2, px, py, 22);
        grad.addColorStop(0, color + "88");
        grad.addColorStop(1, color + "00");
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        // White border
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Name label with dark background
        const shortName = player.name.split(" ").slice(-1)[0];
        ctx.font = "bold 11px sans-serif";
        const textW = ctx.measureText(shortName).width;
        const labelX = px - textW / 2 - 4;
        const labelY = py - 22;

        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.beginPath();
        ctx.roundRect(labelX, labelY - 13, textW + 8, 16, 4);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.fillText(shortName, px - textW / 2, labelY);
      });
    }

    ctx.shadowBlur = 0;
  }, [data, mapLoaded]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    let found: RadarPlayer | null = null;
    for (const player of data.players) {
      const pos = getPlayerPosition(player, canvas.width, canvas.height);
      if (!pos) continue;
      const [px, py] = pos;
      if (Math.sqrt((mx - px) ** 2 + (my - py) ** 2) < 16) { found = player; break; }
    }
    setHoveredPlayer(found);
    setHoverPos(found ? { x: e.clientX, y: e.clientY } : null);
  };

  return (
    <AppLayout>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase flex items-center gap-3" style={{ color: "#4da6ff" }}>
              <Radar className="w-7 h-7" />
              رادار العساكر
            </h2>
            <p className="mt-1 text-sm font-medium" style={{ color: "#7aa8d8" }}>
              مواقع الأفراد على خريطة Liberty County — يتحدث كل 5 ثواني
            </p>
          </div>

          <div className="flex items-center gap-3">
            {online ? (
              <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#4dd27a" }}>
                <Wifi className="w-4 h-4" /> متصل
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#f87171" }}>
                <WifiOff className="w-4 h-4" /> غير متصل
              </span>
            )}
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: "rgba(77,166,255,0.12)", border: "1px solid rgba(77,166,255,0.3)", color: "#4da6ff" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(77,210,120,0.08)", border: "1px solid rgba(77,210,120,0.2)" }}>
            <p className="text-2xl font-black" style={{ color: "#4dd27a" }}>{data?.players.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">على الرادار</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(77,166,255,0.08)", border: "1px solid rgba(77,166,255,0.2)" }}>
            <p className="text-2xl font-black" style={{ color: "#4da6ff" }}>{data?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">في السيرفر</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <p className="text-sm font-bold truncate" style={{ color: "#fbbf24" }}>
              {lastUpdate ? lastUpdate.toLocaleTimeString("ar-SA") : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">آخر تحديث</p>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="rounded-2xl overflow-hidden relative" style={{ border: "1px solid rgba(77,166,255,0.3)" }}>
          {/* Loading overlay */}
          {(!mapLoaded || (loading && !data)) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl" style={{ background: "rgba(4,10,30,0.95)" }}>
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">جاري تحميل الخريطة...</p>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl" style={{ background: "rgba(4,10,30,0.88)" }}>
              <AlertCircle className="w-10 h-10" style={{ color: "#f87171" }} />
              <p className="text-sm font-bold text-center px-6" style={{ color: "#f87171" }}>{error}</p>
              <button onClick={fetchData} className="text-xs px-4 py-2 rounded-lg font-semibold" style={{ background: "rgba(77,166,255,0.15)", color: "#4da6ff", border: "1px solid rgba(77,166,255,0.3)" }}>
                إعادة المحاولة
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={900}
            height={680}
            className="w-full cursor-crosshair"
            style={{ display: "block", background: "#040a1e" }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => { setHoveredPlayer(null); setHoverPos(null); }}
          />

          {/* Compass */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-black px-1.5 py-0.5 rounded" style={{ color: "#fff", background: "rgba(0,0,0,0.55)" }}>N</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-black px-1.5 py-0.5 rounded" style={{ color: "#fff", background: "rgba(0,0,0,0.55)" }}>S</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black px-1.5 py-0.5 rounded" style={{ color: "#fff", background: "rgba(0,0,0,0.55)" }}>E</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-black px-1.5 py-0.5 rounded" style={{ color: "#fff", background: "rgba(0,0,0,0.55)" }}>W</div>

          {/* Hover tooltip */}
          {hoveredPlayer && hoverPos && (
            <div
              className="fixed z-50 rounded-xl p-3 pointer-events-none shadow-xl"
              style={{ left: hoverPos.x + 14, top: hoverPos.y - 80, background: "rgba(4,15,40,0.97)", border: "1px solid rgba(77,210,120,0.5)", minWidth: "190px" }}
            >
              <p className="font-black text-sm" style={{ color: "#4dd27a" }}>{hoveredPlayer.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "#7aa8d8" }}>{hoveredPlayer.rank} — {hoveredPlayer.unit}</p>
              {hoveredPlayer.callsign && (
                <p className="text-xs" style={{ color: "#fbbf24" }}>Callsign: {hoveredPlayer.callsign}</p>
              )}
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Roblox: {hoveredPlayer.robloxUsername}</p>
              {hoveredPlayer.postalCode && (
                <p className="text-xs font-bold mt-1" style={{ color: "#fb923c" }}>
                  📮 رمز البريد: {hoveredPlayer.postalCode}
                </p>
              )}
              {hoveredPlayer.streetName && (
                <p className="text-xs" style={{ color: "#94a3b8" }}>{hoveredPlayer.streetName}</p>
              )}
              <p className="text-xs mt-0.5 font-mono" style={{ color: "rgba(150,180,220,0.5)" }}>
                X:{Math.round(hoveredPlayer.x)} Z:{Math.round(hoveredPlayer.z)}
              </p>
            </div>
          )}
        </div>

        {/* Players list */}
        {data && data.players.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(77,166,255,0.2)" }}>
            <div className="px-4 py-3 text-sm font-bold flex items-center gap-2" style={{ background: "rgba(7,18,50,0.8)", color: "#4da6ff", borderBottom: "1px solid rgba(77,166,255,0.15)" }}>
              <User className="w-4 h-4" />
              العساكر المرصودون ({data.players.length})
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(30,60,120,0.15)" }}>
              {data.players.map((p, idx) => (
                <div key={p.soldierId} className="flex items-center gap-3 px-4 py-2.5" style={{ background: "rgba(4,10,30,0.6)" }}>
                  <span
                    className="w-3 h-3 rounded-full shrink-0 animate-pulse"
                    style={{ background: PLAYER_COLORS[idx % PLAYER_COLORS.length], boxShadow: `0 0 8px ${PLAYER_COLORS[idx % PLAYER_COLORS.length]}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: "#e0eeff" }}>{p.name}</p>
                    <p className="text-xs" style={{ color: "#7aa8d8" }}>{p.rank} — {p.unit}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-xs font-mono" style={{ color: "#4da6ff" }}>{p.robloxUsername}</p>
                    {p.postalCode && (
                      <p className="text-xs font-bold" style={{ color: "#fb923c" }}>📮 {p.postalCode}</p>
                    )}
                    <p className="text-xs font-mono" style={{ color: "rgba(120,160,220,0.4)" }}>
                      {Math.round(p.x)}, {Math.round(p.z)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && data.players.length === 0 && !error && (
          <div className="rounded-2xl p-8 text-center" style={{ border: "1px solid rgba(77,166,255,0.15)", background: "rgba(4,10,30,0.5)" }}>
            <Radar className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(77,166,255,0.4)" }} />
            <p className="text-sm text-muted-foreground">لا يوجد عساكر داخل السيرفر حالياً</p>
            <p className="text-xs text-muted-foreground mt-1">يجب أن يكون الفرد مسجّل دخول وداخل فريق الشرطة</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
