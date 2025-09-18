"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Bolt, Leaf, LineChart, MessageSquare, Share2, Sparkles, Target, Trophy } from "lucide-react";

function formatKg(kg: number) {
  return `${kg.toFixed(1)} kg CO₂e`;
}

function currency(n: number) {
  return `$${n.toFixed(2)}`;
}

export const HomeClient = () => {
  const [dark, setDark] = useState(false);
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
  const [footprint, setFootprint] = useState({ today: 6.4, week: 41.2, month: 171.5 });
  const [forecast, setForecast] = useState<{ day: number; kg: number }[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/forecast");
        const data = await res.json();
        if (!mounted) return;
        const series = (data.series || []).map((s: any, idx: number) => ({ day: idx + 1, kg: s.kg }));
        setForecast(series);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Chat state (demo-only, local LLM stub)
  type Msg = { role: "user" | "assistant"; text: string };
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "I'm your Green Twin. I track your footprint, bust carbon myths, and nudge you when the grid is clean. Ask me anything or paste a product link to estimate its CO₂e.",
    },
  ]);
  const [input, setInput] = useState("");
  function send() {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTimeout(() => {
      const savings = 2 + Math.random() * 3;
      const dollars = savings * 0.18 * 12; // rough annualized electricity savings
      const reply = `Try this swap: schedule laundry at 3–5am when grid is cleaner (now ~${grid} gCO₂/kWh). Estimated ${savings.toFixed(
        1
      )} kg CO₂e/mo and ${currency(dollars)} saved/yr. Also, ${q
        .toLowerCase()
        .includes("beef") ? "swap beef for lentils 1×/wk to cut ~18 kg/mo" : "consider public transit 1×/wk to cut ~12 kg/mo"}.`;
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      setFootprint((f) => ({ ...f, month: Math.max(0, f.month - savings) }));
    }, 600);
  }

  const cleanWindow = useMemo(() => {
    const w = windows?.[0];
    if (!w) return "—";
    const s = new Date(w.start);
    const e = new Date(w.end);
    return `${s.getHours()}:00-${e.getHours()}:00`;
  }, [windows]);

  const leaderboard = [
    { name: "Ava", kg: 286, streak: 12, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop" },
    { name: "Leo", kg: 252, streak: 10, avatar: "https://images.unsplash.com/photo-1502685104-226-ee32379fefbe?q=80&w=200&auto=format&fit=crop" },
    { name: "Maya", kg: 231, streak: 9, avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=200&auto=format&fit=crop" },
    { name: "Zoe", kg: 219, streak: 8, avatar: "https://images.unsplash.com/photo-1545996124-0501ebae84d0?q=80&w=200&auto=format&fit=crop" },
  ];

  function share() {
    const text = "My Green Twin cut my CO₂e this week. Join me.";
    const url = typeof window !== "undefined" ? window.location.href : "https://example.com";
    if (navigator.share) navigator.share({ title: "Green Twin", text, url }).catch(() => {});
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
    const verdicts = ["Likely misleading", "Needs context", "Supported by sources", "False"];
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
    setMessages((m) => [...m, { role: "assistant", text: `Nice swap: ${swapDesc}. Estimated −${v.toFixed(1)} kg CO₂e this month.` }]);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/60 border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          <div className="size-9 grid place-items-center rounded-md bg-primary text-primary-foreground shadow">
            <Leaf className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Green Twin</p>
            <h1 className="text-base font-semibold tracking-tight">Your AI Carbon Companion</h1>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full">Live grid: {grid} gCO₂/kWh</Badge>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
          <Button className="ml-2" onClick={share} variant="secondary"><Share2 className="mr-2 size-4" /> Share</Button>
          <Button className="ml-2" asChild>
            <a href="/pitch#how-to-load"><Leaf className="mr-2 size-4" /> Install extension</a>
          </Button>
          <Button className="ml-2" variant="outline" asChild>
            <a href="/login">Sign in</a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-8">
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Digital Carbon Twin</CardTitle>
              <CardDescription>Passive tracking + predictive nudges. Your baseline, forecast, and savings in one place.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="h-40 rounded-lg bg-gradient-to-r from-chart-1/20 via-chart-2/20 to-chart-3/20 border p-4">
                    <div className="flex items-end gap-1 h-full">
                      {forecast.map((d) => (
                        <div key={d.day} className="flex-1">
                          <div className="mx-0.5 w-full rounded-t bg-chart-2/70" style={{ height: `${d.kg * 12}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">14‑day forecast based on your habits, grid intensity, and seasonality.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <div className="text-2xl font-semibold">{formatKg(footprint.today)}</div>
                    <Progress value={(footprint.today / 10) * 100} className="mt-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <div className="text-xl font-semibold">{formatKg(footprint.month)}</div>
                    <p className="text-xs text-muted-foreground">Projected −12% with current swaps</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Streak 9🔥</Badge>
                    <Badge variant="secondary">Verified Shopper</Badge>
                    <Badge variant="outline">Misinformation Slayer</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><Bolt className="size-5" /> Grid‑aware Nudges</CardTitle>
              <CardDescription>Cut emissions by timing energy use when the grid is clean.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Next clean window</p>
                  <p className="font-medium">{cleanWindow}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current intensity</p>
                  <p className="font-medium">{grid} gCO₂/kWh</p>
                </div>
              </div>
              <Separator />
              <ul className="text-sm space-y-2 list-disc pl-5">
                <li>Schedule laundry in the clean window to save ~1.8 kg</li>
                <li>Delay EV charging start by 2h: save ~2.3 kg</li>
                <li>Pre‑cool home at {cleanWindow.split("-")[0]} to reduce peak load</li>
              </ul>
              <Button className="w-full"><Target className="mr-2 size-4"/> Auto‑schedule my tasks</Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><MessageSquare className="size-5" /> AI Coach</CardTitle>
              <CardDescription>Ask for product footprints, climate myth‑busting, or best swaps with savings.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-[420px]">
              <div className="flex-1 overflow-y-auto rounded border p-3 space-y-3 bg-background/50">
                {messages.map((m, i) => (
                  <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "assistant" ? "bg-secondary" : "bg-primary text-primary-foreground ml-auto"}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input placeholder="Paste a product link or ask a question…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') send(); }} />
                <Button onClick={send} className="shrink-0">Send <ArrowRight className="ml-2 size-4"/></Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Amazon cart scan</Badge>
                <Badge variant="outline">Flight search nudge</Badge>
                <Badge variant="outline">Misinformation detector</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><LineChart className="size-5" /> Economic Impact</CardTitle>
              <CardDescription>Personalized ROI from your swaps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Monthly CO₂e savings</span><span className="font-medium">~{formatKg(12.4)}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Annual bill savings</span><span className="font-medium">{currency(68.40)}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Payback on LED swap</span><span className="font-medium">3.2 months</span></div>
              <Button variant="secondary" className="w-full">View my savings plan</Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><Trophy className="size-5" /> Community Leaderboard</CardTitle>
              <CardDescription>Compete with friends, teams, and neighborhoods.</CardDescription>
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
                    <TableRow key={p.name}>
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
                      <TableCell className="text-right">{formatKg(p.kg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* New: Practical feature cards */}
        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Claim Checker</CardTitle>
              <CardDescription>Paste a statement to get a quick AI-assisted verdict (demo).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder={'e.g., "EVs pollute more than gas cars."'}
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
              />
              <Button className="w-full" onClick={checkClaim}>Check claim</Button>
              {claimVerdict !== null && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Verdict</p>
                  <Badge variant={claimVerdict.includes("Supported") ? "secondary" : claimVerdict.includes("False") ? "destructive" : "outline"}>{claimVerdict}</Badge>
                  <p className="mt-2 text-muted-foreground">Source hint: IPCC AR6, IEA fact sheets (stubbed).</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><Bolt className="size-5" /> Quick Swap Logger</CardTitle>
              <CardDescription>Record a CO₂e-saving action and update your forecast.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="What did you swap? (e.g., oat milk)" value={swapDesc} onChange={(e)=>setSwapDesc(e.target.value)} />
              <div className="flex items-center gap-2">
                <Input type="number" inputMode="decimal" placeholder="kg CO₂e saved" value={swapKg} onChange={(e)=>setSwapKg(e.target.value)} />
                <Button onClick={addSwap}>Add</Button>
              </div>
              {lastSwapMsg && <p className="text-xs text-muted-foreground">{lastSwapMsg}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><Target className="size-5" /> Weekly Goals</CardTitle>
              <CardDescription>Simple targets to keep your streak alive.</CardDescription>
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
              <Separator className="my-2" />
              <Button variant="secondary" className="w-full">See my weekly plan</Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Green Twin. Built for hackathons, ready for scale.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Trophy className="mr-2 size-4"/> Join challenge</Button>
            <Button size="sm" asChild><a href="/pitch#how-to-load"><Leaf className="mr-2 size-4"/> Install extension</a></Button>
          </div>
        </div>
      </footer>
    </div>
  );
};