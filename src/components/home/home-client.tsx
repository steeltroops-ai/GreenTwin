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
  Info,
  Leaf,
  LineChart,
  MessageCircle,
  MessageSquare,
  Moon,
  PieChart,
  Plus,
  Puzzle,
  Share2,
  Sparkles,
  Sun,
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
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

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
  { id: "community", label: "Community", icon: Trophy },
  { id: "tools", label: "Tools", icon: Target },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "about", label: "About", icon: Info },
] as const;

type TabId = (typeof NAVIGATION_TABS)[number]["id"];

export const HomeClient = () => {
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [showFooter, setShowFooter] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { open: openSidebar, isOpen: sidebarIsOpen } = useSidebar();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Footer auto-hide functionality
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show footer when scrolling down, hide when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowFooter(false);
      } else {
        setShowFooter(true);
      }

      setLastScrollY(currentScrollY);

      // Auto-hide after 2 seconds of inactivity
      clearTimeout(hideTimeout);
      setShowFooter(true);
      hideTimeout = setTimeout(() => {
        if (window.scrollY > 100) {
          setShowFooter(false);
        }
      }, 2000);
    };

    const handleMouseMove = () => {
      setShowFooter(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (window.scrollY > 100) {
          setShowFooter(false);
        }
      }, 2000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(hideTimeout);
    };
  }, [lastScrollY]);

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
                    onClick={openSidebar}
                  >
                    <MessageCircle className="mr-1 size-3" />
                    AI Coach
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
                onClick={openSidebar}
              >
                <Zap className="mr-1 size-3" />
                AI Coach
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

  const renderAbout = () => (
    <section className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Project Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Leaf className="size-6 text-green-600" />
            About GreenTwin
          </CardTitle>
          <CardDescription className="text-base">
            Your AI-powered carbon companion for sustainable living
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Project Vision</h3>
            <p className="text-muted-foreground leading-relaxed">
              GreenTwin is an innovative AI-powered platform designed to help
              individuals and communities reduce their carbon footprint through
              intelligent tracking, personalized recommendations, and real-time
              environmental insights. Our mission is to make sustainable living
              accessible, engaging, and impactful for everyone.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">How It Works</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-green-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Smart Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically monitor your carbon footprint through our
                    browser extension
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium">AI Coaching</p>
                  <p className="text-sm text-muted-foreground">
                    Get personalized sustainability advice from our AI coach
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-purple-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Grid Awareness</p>
                  <p className="text-sm text-muted-foreground">
                    Time your energy usage when the grid is cleanest
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-orange-600">4</span>
                </div>
                <div>
                  <p className="font-medium">Community Impact</p>
                  <p className="text-sm text-muted-foreground">
                    Connect with others and amplify your environmental impact
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Goals & Impact */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-emerald-600" />
            Project Goals & Environmental Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3 text-green-600">
                Short-term Goals
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                  <span>
                    Achieve 10,000+ active users tracking their carbon footprint
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                  <span>Deploy browser extension to Chrome Web Store</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                  <span>Integrate with 50+ popular e-commerce platforms</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                  <span>Build community features and social challenges</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-blue-600">
                Long-term Vision
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>
                    Scale to 1 million users making measurable climate impact
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>
                    Partner with corporations for enterprise sustainability
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>Develop AI-powered carbon offset marketplace</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>Create global sustainability research platform</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 rounded-lg p-6">
            <h4 className="font-semibold mb-3 text-center">
              Projected Environmental Impact
            </h4>
            <div className="grid gap-4 md:grid-cols-3 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  2.5M tons
                </div>
                <div className="text-sm text-muted-foreground">
                  CO₂ reduction potential
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">$50M</div>
                <div className="text-sm text-muted-foreground">
                  Consumer savings
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">1M+</div>
                <div className="text-sm text-muted-foreground">
                  Lives impacted
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer & Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5 text-indigo-600" />
            Developer & Vision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="size-16 rounded-full bg-gradient-to-r from-green-500 to-blue-500 mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl">
              M
            </div>
            <h4 className="font-semibold">Mayank</h4>
            <p className="text-sm text-muted-foreground mb-4">
              AI + Fullstack + Robotics Software Engineer
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <h5 className="font-medium mb-1">Expertise</h5>
              <p className="text-muted-foreground">
                Full-stack development, AI/ML systems, robotics engineering, and
                sustainable technology solutions
              </p>
            </div>
            <div>
              <h5 className="font-medium mb-1">Mission</h5>
              <p className="text-muted-foreground">
                Building scalable, research-driven solutions that create
                measurable environmental impact through technology
              </p>
            </div>
            <div>
              <h5 className="font-medium mb-1">Approach</h5>
              <p className="text-muted-foreground">
                Combining cutting-edge AI with user-centric design to make
                sustainability accessible and engaging for everyone
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Architecture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-purple-600" />
            Technical Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">System Design</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                <span>Microservices architecture with Next.js App Router</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                <span>Real-time WebSocket connections for live updates</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                <span>AI-powered analytics with Google Gemini 1.5 Pro</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                <span>Chrome extension with content script injection</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Performance & Scalability</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Core Web Vitals</span>
                <Badge variant="secondary" className="text-green-600">
                  Excellent
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lighthouse Score</span>
                <Badge variant="secondary" className="text-green-600">
                  95+
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accessibility</span>
                <Badge variant="secondary" className="text-green-600">
                  WCAG 2.1 AA
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security</span>
                <Badge variant="secondary" className="text-green-600">
                  Enterprise-grade
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-background/98 border-b border-border/30 shadow-lg">
        <div className="w-full px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="size-10 grid place-items-center rounded-xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white shadow-lg ring-2 ring-green-500/20">
            <Leaf className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/90">
              Green Twin
            </p>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Your AI Carbon Companion
            </h1>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            {NAVIGATION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 backdrop-blur-md border button-enhanced ${
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

          {/* Theme Toggle and Install Extension */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDark(!dark)}
              className="button-enhanced p-2"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              className="button-enhanced bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
              asChild
              size="sm"
            >
              <a href="/pitch#how-to-load">
                <Leaf className="mr-2 size-4" /> Install extension
              </a>
            </Button>
          </div>

          {/* Single Authentication Button */}
          <SignedOut>
            <SignUpButton mode="modal">
              <Button className="button-enhanced" variant="default">
                Sign In
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

      <main
        className={cn(
          "flex-1 w-full px-4 sm:px-6 pt-[93px] pb-16 overflow-y-auto transition-all duration-300 ease-in-out",
          sidebarIsOpen && "lg:mr-96"
        )}
      >
        {/* Tabbed Content with smooth transitions */}
        <div className="animate-in fade-in-0 duration-300 max-w-7xl mx-auto min-h-[calc(100vh-300px)]">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "community" && renderCommunity()}
          {activeTab === "tools" && renderTools()}
          {activeTab === "analytics" && renderAnalytics()}
          {activeTab === "about" && renderAbout()}
        </div>

        {/* Footer as part of content flow with proper spacing */}
        <footer
          className={cn(
            "mt-20 pt-12 border-t border-border/30 bg-background/50 backdrop-blur-sm transition-all duration-300",
            showFooter ? "opacity-100" : "opacity-50"
          )}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground font-medium">
              © {new Date().getFullYear()} Green Twin • Developer: Mayank (AI +
              Fullstack + Robotics SWE)
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
      </main>
    </div>
  );
};
