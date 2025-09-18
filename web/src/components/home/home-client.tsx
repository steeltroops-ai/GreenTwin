"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  BarChart3,
  Bolt,
  Calculator,
  Calendar,
  Clock,
  Download,
  Leaf,
  LineChart,
  MessageCircle,
  MessageSquare,
  PieChart,
  Plus,
  Puzzle,
  Share2,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
  Zap,
} from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import {
  ConnectionStatus,
  RealtimeEventsFeed,
} from "@/contexts/WebSocketContext";
import { PredictiveTimeline } from "@/components/PredictiveTimeline";
import { AchievementSystem } from "@/components/AchievementSystem";
import { ChatInterface } from "@/components/ai-coach/ChatInterface";

function formatKg(kg: number | undefined) {
  if (kg === undefined || kg === null || isNaN(kg)) {
    return "0.0 kg CO₂e";
  }
  return `${kg.toFixed(1)} kg CO₂e`;
}

function currency(n: number) {
  return `$${n.toFixed(2)}`;
}

// Navigation tabs configuration
const NAVIGATION_TABS = [
  { id: "dashboard", label: "Dashboard", icon: Sparkles },
  { id: "coach", label: "AI Coach", icon: MessageSquare },
  { id: "community", label: "Community", icon: Trophy },
  { id: "tools", label: "Tools", icon: Target },
  { id: "analytics", label: "Analytics", icon: LineChart },
] as const;

type TabId = (typeof NAVIGATION_TABS)[number]["id"];

export const HomeClient = () => {
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Mock live grid intensity (gCO2/kWh)
  const [grid, setGrid] = useState(428);
  const [windows, setWindows] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/grid");
        const data = await res.json();
        if (!mounted) return;
        setGrid(data.current);
        setWindows(data.windows || []);
      } catch {}
    };
    refresh();
    const id = setInterval(refresh, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // Mock twin state
  const [footprint, setFootprint] = useState({
    today: 6.4,
    week: 41.2,
    month: 171.5,
  });
  const [forecast, setForecast] = useState<{ day: number; kg: number }[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/forecast");
        const data = await res.json();
        if (!mounted) return;
        const series = (data.series || []).map((s: any, idx: number) => ({
          day: idx + 1,
          kg: s.kg,
        }));
        setForecast(series);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cleanWindow = useMemo(() => {
    const w = windows?.[0];
    if (!w) return "—";
    const s = new Date(w.start);
    const e = new Date(w.end);
    return `${s.getHours()}:00-${e.getHours()}:00`;
  }, [windows]);

  const leaderboard = [
    {
      name: "Ava",
      kg: 286,
      streak: 12,
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
    },
    {
      name: "Leo",
      kg: 252,
      streak: 10,
      avatar:
        "https://images.unsplash.com/photo-1502685104-226-ee32379fefbe?q=80&w=200&auto=format&fit=crop",
    },
    {
      name: "Maya",
      kg: 231,
      streak: 9,
      avatar:
        "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=200&auto=format&fit=crop",
    },
    {
      name: "Zoe",
      kg: 219,
      streak: 8,
      avatar:
        "https://images.unsplash.com/photo-1545996124-0501ebae84d0?q=80&w=200&auto=format&fit=crop",
    },
  ];

  function share() {
    const text = "My Green Twin cut my CO₂e this week. Join me.";
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : "https://example.com";
    if (navigator.share)
      navigator.share({ title: "Green Twin", text, url }).catch(() => {});
    else navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
  }

  // New: Claim checker + quick swap logger state/handlers
  const [claimText, setClaimText] = useState("");
  const [claimVerdict, setClaimVerdict] = useState<string | null>(null);
  const [swapDesc, setSwapDesc] = useState("");
  const [swapKg, setSwapKg] = useState<string>("");
  const [lastSwapMsg, setLastSwapMsg] = useState<string | null>(null);

  function checkClaim() {
    if (!claimText.trim()) return;
    setClaimVerdict(null);
    // demo-only stubbed verdict
    const verdicts = [
      "Likely misleading",
      "Needs context",
      "Supported by sources",
      "False",
    ];
    setTimeout(() => {
      const v = verdicts[Math.floor(Math.random() * verdicts.length)];
      setClaimVerdict(v);
    }, 500);
  }

  function addSwap() {
    const v = parseFloat(swapKg);
    if (!swapDesc.trim() || isNaN(v) || v <= 0) return;
    // reduce projected monthly footprint by logged savings
    setFootprint((f) => ({ ...f, month: Math.max(0, f.month - v) }));
    setLastSwapMsg(`Logged: “${swapDesc}” — saved ${v.toFixed(1)} kg CO₂e`);
    setSwapDesc("");
    setSwapKg("");
    // optional: also drop a message in coach thread for visibility
    // setMessages((m: any[]) => [
    //   ...m,
    //   {
    //     role: "assistant",
    //     text: `Nice swap: ${swapDesc}. Estimated −${v.toFixed(1)} kg CO₂e this month.`,
    //   },
    // ]);
  }

  // Render functions for each tab
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Top Row - Main Dashboard Cards */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Digital Carbon Twin */}
        <Card className="lg:col-span-1 overflow-hidden card-enhanced">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-bold">
              <Sparkles className="size-5 text-primary" />
              <span className="text-gradient">Digital Carbon Twin</span>
            </CardTitle>
            <CardDescription className="font-medium">
              Passive tracking + predictive nudges. Your baseline, forecast, and
              savings in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="h-40 rounded-lg bg-gradient-to-r from-chart-1/20 via-chart-2/20 to-chart-3/20 border p-4">
                  <div className="flex items-end gap-1 h-full">
                    {forecast.map((d) => (
                      <div key={d.day} className="flex-1">
                        <div
                          className="mx-0.5 w-full rounded-t bg-chart-2/70"
                          style={{ height: `${d.kg * 12}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  14‑day forecast based on your habits, grid intensity, and
                  seasonality.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <div className="text-2xl font-semibold">
                    {formatKg(footprint.today)}
                  </div>
                  <Progress
                    value={(footprint.today / 10) * 100}
                    className="mt-1"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <div className="text-xl font-semibold">
                    {formatKg(footprint.month)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Projected −12% with current swaps
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge>Streak 9🔥</Badge>
                  <Badge variant="secondary">Verified Shopper</Badge>
                  <Badge variant="outline">Misinformation Slayer</Badge>
                </div>
                {/* Quick Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 button-enhanced font-semibold"
                    onClick={() => setActiveTab("coach")}
                  >
                    <MessageCircle className="mr-1 size-3" />
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 button-enhanced font-semibold"
                    onClick={() => setActiveTab("analytics")}
                  >
                    <BarChart3 className="mr-1 size-3" />
                    Analytics
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid-aware Nudges */}
        <Card className="card-enhanced">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-bold">
              <Bolt className="size-5 text-primary" />
              <span className="text-gradient">Grid‑aware Nudges</span>
            </CardTitle>
            <CardDescription className="font-medium">
              Cut emissions by timing energy use when the grid is clean.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Next clean window
                </p>
                <p className="font-medium">{cleanWindow}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Current intensity
                </p>
                <p className="text-lg font-semibold">{grid} gCO₂/kWh</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li>• Schedule laundry in the clean window to save ~1.8 kg</li>
              <li>• Delay EV charging start by 2h: save ~2.3 kg</li>
              <li>• Pre‑cool home at {cleanWindow} to reduce peak load</li>
            </ul>
            <div className="flex gap-2">
              <Button
                className="flex-1 button-enhanced font-semibold bg-gradient-to-r from-primary to-primary/90"
                size="sm"
              >
                <Bolt className="mr-2 size-4" /> Auto‑schedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="button-enhanced font-semibold"
                onClick={() => setActiveTab("tools")}
              >
                <Calendar className="mr-1 size-3" />
                Tools
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Second Row - Additional Dashboard Widgets */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Stats */}
        <Card className="card-enhanced">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-5 text-green-600" />
              <CardTitle className="text-lg font-bold text-gradient">
                Quick Stats
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Weekly avg</span>
              <span className="font-medium">
                {formatKg(footprint.week / 7)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Best day</span>
              <span className="font-medium text-green-600">
                {formatKg(4.2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Goal progress
              </span>
              <span className="font-medium">73%</span>
            </div>
            <Progress value={73} className="mt-2" />
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs button-enhanced font-semibold"
                onClick={() => setActiveTab("analytics")}
              >
                <Target className="mr-1 size-3" />
                Goals
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs button-enhanced font-semibold"
                onClick={() => setActiveTab("tools")}
              >
                <Calculator className="mr-1 size-3" />
                Log
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-blue-600" />
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground">Oat milk swap</span>
                <span className="text-green-600 font-medium">-2.1 kg</span>
              </div>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground">Bus to work</span>
                <span className="text-green-600 font-medium">-3.4 kg</span>
              </div>
              <p className="text-xs text-muted-foreground">Yesterday</p>
            </div>
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground">LED bulb install</span>
                <span className="text-green-600 font-medium">-0.8 kg</span>
              </div>
              <p className="text-xs text-muted-foreground">3 days ago</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3 text-xs"
              onClick={() => setActiveTab("tools")}
            >
              <Plus className="mr-1 size-3" />
              Add New Swap
            </Button>
          </CardContent>
        </Card>

        {/* Extension Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Puzzle className="size-5 text-purple-600" />
              <CardTitle className="text-lg">Extension Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection</span>
              <Badge variant="secondary" className="text-orange-600">
                Offline
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last sync</span>
              <span className="text-sm font-medium">Never</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-medium">v1.2.0</span>
            </div>
            <Button size="sm" variant="outline" className="w-full">
              <Download className="mr-2 size-4" />
              Install Extension
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Third Row - Charts and Analytics Preview */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-indigo-600" />
              <CardTitle className="text-lg">Weekly Trend</CardTitle>
            </div>
            <CardDescription>
              Your carbon footprint over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (day, i) => {
                  const value = [5.2, 4.8, 6.1, 4.3, 5.9, 7.2, 6.4][i];
                  const percentage = (value / 8) * 100;
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-8">{day}</span>
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground w-16">
                        {formatKg(value)}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setActiveTab("analytics")}
              >
                <LineChart className="mr-1 size-3" />
                Full Report
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setActiveTab("community")}
              >
                <Trophy className="mr-1 size-3" />
                Compare
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Savings Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="size-5 text-emerald-600" />
              <CardTitle className="text-lg">Savings Breakdown</CardTitle>
            </div>
            <CardDescription>
              Where your CO₂e reductions come from
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Transport</span>
                </div>
                <span className="text-sm font-medium">{formatKg(8.4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Diet</span>
                </div>
                <span className="text-sm font-medium">{formatKg(6.2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Energy</span>
                </div>
                <span className="text-sm font-medium">{formatKg(3.8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Shopping</span>
                </div>
                <span className="text-sm font-medium">{formatKg(2.1)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setActiveTab("coach")}
              >
                <Zap className="mr-1 size-3" />
                Get Tips
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setActiveTab("tools")}
              >
                <Plus className="mr-1 size-3" />
                Track More
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );

  const renderCoach = () => (
    <section className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 h-[500px]">
        <ChatInterface />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <LineChart className="size-5" /> Economic Impact
          </CardTitle>
          <CardDescription>Personalized ROI from your swaps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Monthly CO₂e savings
            </span>
            <span className="font-medium">~{formatKg(12.4)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Annual bill savings
            </span>
            <span className="font-medium">{currency(68.4)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Payback on LED swap
            </span>
            <span className="font-medium">3.2 months</span>
          </div>
          <Button className="w-full mt-4" variant="outline" size="sm">
            View my savings plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Bolt className="size-5" /> Extension Activity
          </CardTitle>
          <CardDescription>
            Real-time sync with your browser extension
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RealtimeEventsFeed />
        </CardContent>
      </Card>
    </section>
  );

  const renderCommunity = () => (
    <section className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5" /> Community Leaderboard
          </CardTitle>
          <CardDescription>
            Compete with friends, teams, and neighborhoods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead className="text-right">CO₂e saved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={p.avatar} alt={p.name} />
                        <AvatarFallback>{p.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.streak} days</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatKg(p.kg)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Community Stats</CardTitle>
          <CardDescription>Your impact in the community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">3rd</div>
            <p className="text-sm text-muted-foreground">Your rank</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total members</span>
              <span className="font-medium">1,247</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Active this week</span>
              <span className="font-medium">892</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Community savings</span>
              <span className="font-medium">{formatKg(15420)}</span>
            </div>
          </div>
          <Button className="w-full" variant="outline" size="sm">
            <Trophy className="mr-2 size-4" /> Join challenge
          </Button>
        </CardContent>
      </Card>
    </section>
  );

  const renderTools = () => (
    <section className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5" /> Claim Checker
          </CardTitle>
          <CardDescription>
            Paste a statement to get a quick AI-assisted verdict (demo).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={'e.g., "EVs pollute more than gas cars."'}
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
          />
          <Button onClick={checkClaim} className="w-full" size="sm">
            Check claim
          </Button>
          {claimVerdict !== null && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Verdict</p>
              <Badge
                variant={
                  claimVerdict === "true"
                    ? "default"
                    : claimVerdict === "false"
                      ? "destructive"
                      : "secondary"
                }
              >
                {claimVerdict === "true"
                  ? "Likely True"
                  : claimVerdict === "false"
                    ? "Likely False"
                    : "Needs Context"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Bolt className="size-5" /> Quick Swap Logger
          </CardTitle>
          <CardDescription>
            Record a CO₂e-saving action and update your forecast.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="What did you swap? (e.g., oat milk)"
            value={swapDesc}
            onChange={(e) => setSwapDesc(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="kg CO₂e"
              value={swapKg}
              onChange={(e) => setSwapKg(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addSwap} size="sm">
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5" /> Weekly Goals
          </CardTitle>
          <CardDescription>
            Simple targets to keep your streak alive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Transit swap ×1</span>
            <Badge variant="outline">+12 kg</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Beef-free meals ×2</span>
            <Badge variant="outline">+18 kg</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Laundry in clean window</span>
            <Badge variant="outline">+1.8 kg</Badge>
          </div>
          <Button className="w-full mt-4" variant="outline" size="sm">
            See my weekly plan
          </Button>
        </CardContent>
      </Card>
    </section>
  );

  const renderAnalytics = () => (
    <section className="space-y-6">
      <PredictiveTimeline />
      <AchievementSystem />
    </section>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-background/95 border-b border-border/50 shadow-sm">
        <div className="w-full px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="size-9 grid place-items-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
            <Leaf className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">
              Green Twin
            </p>
            <h1 className="text-base font-semibold tracking-tight text-gradient">
              Your AI Carbon Companion
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <ConnectionStatus />
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 font-medium border border-border/50"
            >
              Live grid:{" "}
              <span className="font-semibold text-foreground">
                {grid} gCO₂/kWh
              </span>
            </Badge>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
          <Button
            className="ml-2 button-enhanced"
            onClick={share}
            variant="secondary"
          >
            <Share2 className="mr-2 size-4" /> Share
          </Button>
          <Button
            className="ml-2 button-enhanced bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
            asChild
          >
            <a href="/pitch#how-to-load">
              <Leaf className="mr-2 size-4" /> Install extension
            </a>
          </Button>

          {/* Clerk Authentication */}
          <SignedOut>
            <SignInButton mode="modal">
              <Button className="ml-2 button-enhanced" variant="outline">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="ml-2 button-enhanced" variant="default">
                Sign up
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </SignedIn>
        </div>
      </header>

      {/* Transparent Secondary Header with Floating Navigation */}
      <nav className="fixed top-[85px] left-0 right-0 z-20">
        <div className="w-full px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            {NAVIGATION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 min-h-[44px] backdrop-blur-md border button-enhanced ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg border-primary/30 shadow-primary/20"
                      : "bg-background/85 text-muted-foreground hover:text-foreground hover:bg-background/95 border-border/40 hover:border-border/70 hover:shadow-md"
                  }`}
                >
                  <Icon className="size-4 flex-shrink-0" />
                  <span className="hidden sm:inline font-semibold">
                    {tab.label}
                  </span>
                  <span className="sm:hidden text-xs font-semibold">
                    {tab.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full px-4 sm:px-6 pt-[150px] pb-20 overflow-y-auto">
        {/* Tabbed Content with smooth transitions */}
        <div className="animate-in fade-in-0 duration-300 max-w-7xl mx-auto">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "coach" && renderCoach()}
          {activeTab === "community" && renderCommunity()}
          {activeTab === "tools" && renderTools()}
          {activeTab === "analytics" && renderAnalytics()}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 z-10 shadow-lg">
        <div className="w-full px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} Green Twin
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1 button-enhanced font-semibold"
            >
              <Trophy className="mr-1 size-3" /> Challenge
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1 button-enhanced font-semibold"
              asChild
            >
              <a href="/pitch#how-to-load">
                <Leaf className="mr-1 size-3" /> Extension
              </a>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};
