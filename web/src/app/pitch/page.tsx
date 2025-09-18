"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Leaf, LineChart, Trophy } from "lucide-react";

export default function PitchPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center gap-3">
          <div className="size-9 grid place-items-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pitch Script</p>
            <h1 className="text-lg font-semibold">
              Green Twin – Grand Prize Narrative
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Story in 60 seconds</CardTitle>
            <CardDescription>
              Open with the problem, land on predictive interventions, show
              passive magic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Everyone wants to cut carbon without friction. Data is
                scattered, advice is noisy.
              </li>
              <li>
                Meet your Green Twin: a passive tracker that learns your habits,
                forecasts your footprint, and nudges you when it matters.
              </li>
              <li>
                It scans carts and travel searches, detects climate
                misinformation, and times home energy use to cleaner grid
                windows.
              </li>
              <li>
                We turn that into CO₂e and dollar savings, gamify streaks, and
                scale through social and utility partnerships.
              </li>
            </ol>
          </CardContent>
        </Card>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="size-5" /> Live Demo Beats
              </CardTitle>
              <CardDescription>
                Follow this sequence during judging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Open dashboard: show Digital Twin, forecast bars, and grid
                  intensity badge.
                </li>
                <li>
                  Type a question into AI Coach (e.g., "beef vs lentils") and
                  show actionable swap with savings.
                </li>
                <li>
                  Click Install Extension → on an Amazon product page, nudge
                  appears with estimated CO₂e.
                </li>
                <li>
                  Search a flight (e.g., SFO-LAX). Show travel nudge and
                  background event tracking in popup.
                </li>
                <li>
                  Return to dashboard: leaderboard and badges reflect progress;
                  share to social.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5" /> Rubric Alignment
              </CardTitle>
              <CardDescription>Hit every line item clearly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Innovation</p>
                <p className="text-muted-foreground">
                  Personal carbon digital twin + grid-aware timing +
                  misinformation slayer.
                </p>
              </div>
              <div>
                <p className="font-medium">Tech Execution</p>
                <p className="text-muted-foreground">
                  MV3 extension (passive scrape), live Next.js dashboard, AI
                  chat actions, mock APIs.
                </p>
              </div>
              <div>
                <p className="font-medium">Climate Impact</p>
                <p className="text-muted-foreground">
                  2.1–4.5 kg CO₂e/user/week modeled; compounding via community
                  challenges.
                </p>
              </div>
              <div>
                <p className="font-medium">Feasibility/Scale</p>
                <p className="text-muted-foreground">
                  Freemium + affiliate green swaps + utility rebates; extension
                  handles 80% tracking.
                </p>
              </div>
              <div>
                <p className="font-medium">Presentation</p>
                <p className="text-muted-foreground">
                  Clear narrative, data-backed estimates, and live, interactive
                  demo.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Impact Model</CardTitle>
            <CardDescription>
              Translate nudges into annualized CO₂e and $ savings.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="p-4 rounded-md border">
              <p className="text-muted-foreground">Grid-aware laundry timing</p>
              <p className="text-lg font-semibold">~1.8 kg/week</p>
              <Badge className="mt-2" variant="secondary">
                Low effort
              </Badge>
            </div>
            <div className="p-4 rounded-md border">
              <p className="text-muted-foreground">Beef → Lentils 1×/wk</p>
              <p className="text-lg font-semibold">~18 kg/month</p>
              <Badge className="mt-2" variant="secondary">
                High impact
              </Badge>
            </div>
            <div className="p-4 rounded-md border">
              <p className="text-muted-foreground">EV charge shift (2h)</p>
              <p className="text-lg font-semibold">~2.3 kg/session</p>
              <Badge className="mt-2" variant="secondary">
                Utility rebate
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card id="how-to-load">
          <CardHeader>
            <CardTitle>How to load the extension</CardTitle>
            <CardDescription>
              60 seconds setup for the judge's laptop
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Open Chrome → chrome://extensions → toggle Developer Mode.
              </li>
              <li>
                Click "Load unpacked" → select the public/extension folder of
                this project.
              </li>
              <li>
                Pin Green Twin → click the icon → verify stats and toggles.
              </li>
            </ol>
            <Separator className="my-2" />
            <Button asChild>
              <Link href="/">
                Back to dashboard <ArrowRight className="ml-2 inline size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div
          className="rounded-lg h-40 border bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1509395176047-4a66953fd231?q=80&w=1400&auto=format&fit=crop)",
          }}
        />
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Green Twin
        </div>
      </footer>
    </div>
  );
}
