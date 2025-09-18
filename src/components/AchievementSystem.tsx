"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Medal,
  Star,
  Share2,
  Target,
  TrendingUp,
  Users,
  Award,
  Zap,
  Crown,
} from "lucide-react";
import { CommunityLeaderboardSystem } from "../lib/leaderboard-system";

interface AchievementSystemProps {
  className?: string;
}

export function AchievementSystem({ className }: AchievementSystemProps) {
  const [leaderboardSystem, setLeaderboardSystem] =
    useState<CommunityLeaderboardSystem | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [viewMode, setViewMode] = useState<
    "leaderboard" | "achievements" | "stats"
  >("leaderboard");

  useEffect(() => {
    const system = new CommunityLeaderboardSystem();
    setLeaderboardSystem(system);

    // Load initial data
    setLeaderboard(system.getLeaderboard("all_time", 10));
    setUserAchievements(system.getUserAchievements());
    setAllAchievements(system.getAchievements());
    setUserRank(system.getUserRank());
    setStats(system.getLeaderboardStats());
  }, []);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "text-gray-600 bg-gray-100";
      case "rare":
        return "text-blue-600 bg-blue-100";
      case "epic":
        return "text-purple-600 bg-purple-100";
      case "legendary":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case "common":
        return <Medal className="size-4" />;
      case "rare":
        return <Star className="size-4" />;
      case "epic":
        return <Award className="size-4" />;
      case "legendary":
        return <Crown className="size-4" />;
      default:
        return <Medal className="size-4" />;
    }
  };

  const shareAchievement = () => {
    if (!leaderboardSystem) return;

    const shareText = leaderboardSystem.generateShareableCard();

    if (navigator.share) {
      navigator
        .share({
          title: "Green Twin Achievement",
          text: shareText,
          url: window.location.href,
        })
        .catch(() => {
          navigator.clipboard.writeText(shareText);
          alert("Achievement card copied to clipboard!");
        });
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Achievement card copied to clipboard!");
    }
  };

  const simulateProgress = () => {
    if (!leaderboardSystem) return;

    // Simulate saving some CO2
    const randomSaving = 1 + Math.random() * 5;
    const result = leaderboardSystem.updateUserProgress(randomSaving);

    if (result) {
      setLeaderboard(leaderboardSystem.getLeaderboard("all_time", 10));
      setUserAchievements(leaderboardSystem.getUserAchievements());
      setUserRank(leaderboardSystem.getUserRank());
      setStats(leaderboardSystem.getLeaderboardStats());

      if (result.newAchievements.length > 0) {
        alert(
          `🎉 New Achievement Unlocked: ${result.newAchievements[0].name}!`
        );
      }
    }
  };

  if (!leaderboardSystem) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Community Leaderboard</CardTitle>
          <CardDescription>Loading community data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5" />
          Community Leaderboard
        </CardTitle>
        <CardDescription>
          Compete with the community and unlock achievements
        </CardDescription>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={viewMode === "leaderboard" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("leaderboard")}
          >
            <Users className="mr-2 size-4" />
            Leaderboard
          </Button>
          <Button
            variant={viewMode === "achievements" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("achievements")}
          >
            <Award className="mr-2 size-4" />
            Achievements
          </Button>
          <Button
            variant={viewMode === "stats" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("stats")}
          >
            <TrendingUp className="mr-2 size-4" />
            Stats
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User Rank Summary */}
        {userRank && (
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Your Rank</div>
                <div className="text-sm text-muted-foreground">
                  #{userRank.all_time} All Time • #{userRank.monthly} This Month
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {stats?.total_co2_saved || 0}kg
                </div>
                <div className="text-sm text-muted-foreground">CO₂ Saved</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard View */}
        {viewMode === "leaderboard" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Top Carbon Savers</h4>
              <Badge variant="outline">
                {stats?.total_participants || 0} participants
              </Badge>
            </div>

            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    entry.id === "current_user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {entry.anonymous_name}
                      {entry.id === "current_user" && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.current_streak} day streak •{" "}
                      {entry.achievements.length} achievements
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {entry.total_co2_saved}kg
                    </div>
                    <div className="text-xs text-muted-foreground">
                      CO₂ saved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements View */}
        {viewMode === "achievements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Your Achievements</h4>
              <Badge variant="outline">
                {userAchievements.length}/{allAchievements.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {allAchievements.map((achievement) => {
                const isUnlocked = userAchievements.some(
                  (ua) => ua.id === achievement.id
                );

                return (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-lg border ${
                      isUnlocked
                        ? "bg-background border-border"
                        : "bg-muted/30 border-muted opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`text-2xl ${isUnlocked ? "" : "grayscale"}`}
                      >
                        {achievement.icon}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {achievement.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getRarityColor(achievement.rarity)}`}
                          >
                            {getRarityIcon(achievement.rarity)}
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                        {!isUnlocked && achievement.criteria.threshold && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>
                                {achievement.criteria.type === "co2_saved"
                                  ? `${Math.min(127.3, achievement.criteria.threshold)}/${achievement.criteria.threshold}kg`
                                  : `${Math.min(12, achievement.criteria.threshold)}/${achievement.criteria.threshold} days`}
                              </span>
                            </div>
                            <Progress
                              value={
                                achievement.criteria.type === "co2_saved"
                                  ? (127.3 / achievement.criteria.threshold) *
                                    100
                                  : (12 / achievement.criteria.threshold) * 100
                              }
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-medium text-primary">
                          +{achievement.points}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          points
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats View */}
        {viewMode === "stats" && stats && (
          <div className="space-y-4">
            <h4 className="font-semibold">Community Stats</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.total_co2_saved}kg
                </div>
                <div className="text-sm text-muted-foreground">
                  Total CO₂ Saved
                </div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.average_savings}kg
                </div>
                <div className="text-sm text-muted-foreground">
                  Average per User
                </div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.top_streak}
                </div>
                <div className="text-sm text-muted-foreground">
                  Longest Streak
                </div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.achievements_unlocked}
                </div>
                <div className="text-sm text-muted-foreground">
                  Achievements
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                🌍 Community Impact
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Together, we've saved the equivalent of{" "}
                {Math.round(stats.total_co2_saved / 2.3)}
                gallons of gasoline or {Math.round(stats.total_co2_saved / 0.4)}
                pounds of coal from being burned!
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={shareAchievement}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Share2 className="mr-2 size-4" />
            Share Progress
          </Button>
          <Button
            onClick={simulateProgress}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Zap className="mr-2 size-4" />
            Simulate Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
