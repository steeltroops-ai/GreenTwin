interface LeaderboardEntry {
  id: string;
  anonymous_name: string;
  avatar_seed: string;
  total_co2_saved: number;
  current_streak: number;
  longest_streak: number;
  achievements: string[];
  last_activity: number;
  join_date: number;
  weekly_savings: number[];
  monthly_rank: number;
  all_time_rank: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: "co2_saved" | "streak" | "consistency" | "category" | "special";
    threshold?: number;
    category?: string;
    special_condition?: string;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
  points: number;
}

interface LeaderboardStats {
  total_participants: number;
  total_co2_saved: number;
  average_savings: number;
  top_streak: number;
  most_active_day: string;
  achievements_unlocked: number;
}

export class CommunityLeaderboardSystem {
  private entries: Map<string, LeaderboardEntry> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private userEntry: LeaderboardEntry | null = null;
  private storageKey = "gt_leaderboard_v1";

  constructor() {
    this.initializeAchievements();
    this.loadLeaderboard();
  }

  private initializeAchievements() {
    const achievementDefinitions: Achievement[] = [
      // CO2 Savings Achievements
      {
        id: "first_save",
        name: "First Steps",
        description: "Saved your first 1kg of CO₂",
        icon: "🌱",
        criteria: { type: "co2_saved", threshold: 1 },
        rarity: "common",
        points: 10,
      },
      {
        id: "carbon_saver",
        name: "Carbon Saver",
        description: "Saved 50kg of CO₂",
        icon: "🌿",
        criteria: { type: "co2_saved", threshold: 50 },
        rarity: "common",
        points: 50,
      },
      {
        id: "eco_warrior",
        name: "Eco Warrior",
        description: "Saved 200kg of CO₂",
        icon: "🌳",
        criteria: { type: "co2_saved", threshold: 200 },
        rarity: "rare",
        points: 200,
      },
      {
        id: "climate_champion",
        name: "Climate Champion",
        description: "Saved 500kg of CO₂",
        icon: "🏆",
        criteria: { type: "co2_saved", threshold: 500 },
        rarity: "epic",
        points: 500,
      },
      {
        id: "planet_protector",
        name: "Planet Protector",
        description: "Saved 1000kg of CO₂",
        icon: "🌍",
        criteria: { type: "co2_saved", threshold: 1000 },
        rarity: "legendary",
        points: 1000,
      },

      // Streak Achievements
      {
        id: "consistent_week",
        name: "Week Warrior",
        description: "Maintained a 7-day streak",
        icon: "🔥",
        criteria: { type: "streak", threshold: 7 },
        rarity: "common",
        points: 25,
      },
      {
        id: "monthly_master",
        name: "Monthly Master",
        description: "Maintained a 30-day streak",
        icon: "⚡",
        criteria: { type: "streak", threshold: 30 },
        rarity: "rare",
        points: 100,
      },
      {
        id: "streak_legend",
        name: "Streak Legend",
        description: "Maintained a 100-day streak",
        icon: "💫",
        criteria: { type: "streak", threshold: 100 },
        rarity: "legendary",
        points: 500,
      },

      // Category Achievements
      {
        id: "transport_optimizer",
        name: "Transport Optimizer",
        description: "Saved 100kg CO₂ from transport choices",
        icon: "🚲",
        criteria: { type: "category", threshold: 100, category: "transport" },
        rarity: "rare",
        points: 150,
      },
      {
        id: "shopping_sage",
        name: "Shopping Sage",
        description: "Saved 100kg CO₂ from smart shopping",
        icon: "🛒",
        criteria: { type: "category", threshold: 100, category: "shopping" },
        rarity: "rare",
        points: 150,
      },
      {
        id: "energy_expert",
        name: "Energy Expert",
        description: "Saved 50kg CO₂ from energy optimization",
        icon: "⚡",
        criteria: { type: "category", threshold: 50, category: "energy" },
        rarity: "rare",
        points: 100,
      },

      // Special Achievements
      {
        id: "early_adopter",
        name: "Early Adopter",
        description: "Joined Green Twin in the first month",
        icon: "🚀",
        criteria: { type: "special", special_condition: "early_adopter" },
        rarity: "epic",
        points: 250,
      },
      {
        id: "community_builder",
        name: "Community Builder",
        description: "Helped 10 friends join Green Twin",
        icon: "🤝",
        criteria: { type: "special", special_condition: "referrals_10" },
        rarity: "epic",
        points: 300,
      },
      {
        id: "perfect_week",
        name: "Perfect Week",
        description: "Achieved daily goals for 7 consecutive days",
        icon: "✨",
        criteria: { type: "special", special_condition: "perfect_week" },
        rarity: "rare",
        points: 100,
      },
    ];

    achievementDefinitions.forEach((achievement) => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  private async loadLeaderboard() {
    try {
      // In a real app, this would load from a server
      // For demo, we'll generate mock data
      this.generateMockLeaderboard();
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    }
  }

  private generateMockLeaderboard() {
    const mockNames = [
      "EcoExplorer",
      "GreenGuru",
      "CarbonCrusher",
      "SustainableSam",
      "ClimateChamp",
      "EarthGuardian",
      "NatureNinja",
      "PlanetPal",
      "EcoWarrior",
      "GreenMachine",
      "CarbonCutter",
      "SolarSage",
      "WindWalker",
      "TreeHugger",
      "OceanProtector",
      "RecycleRanger",
      "BikeBuilder",
      "SolarSaver",
      "WaterWise",
      "EnergyExpert",
    ];

    for (let i = 0; i < 20; i++) {
      const id = `user_${i + 1}`;
      const joinDate = Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000; // Last 90 days
      const totalSaved = 50 + Math.random() * 400; // 50-450kg saved
      const streak = Math.floor(Math.random() * 45); // 0-45 day streak

      const entry: LeaderboardEntry = {
        id,
        anonymous_name: mockNames[i] || `EcoUser${i + 1}`,
        avatar_seed: `seed_${i + 1}`,
        total_co2_saved: Math.round(totalSaved * 10) / 10,
        current_streak: streak,
        longest_streak: streak + Math.floor(Math.random() * 20),
        achievements: this.generateMockAchievements(totalSaved, streak),
        last_activity: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Last week
        join_date: joinDate,
        weekly_savings: this.generateWeeklySavings(),
        monthly_rank: 0, // Will be calculated
        all_time_rank: 0, // Will be calculated
      };

      this.entries.set(id, entry);
    }

    // Add current user
    this.userEntry = {
      id: "current_user",
      anonymous_name: "You",
      avatar_seed: "current_user_seed",
      total_co2_saved: 127.3,
      current_streak: 12,
      longest_streak: 18,
      achievements: ["first_save", "carbon_saver", "consistent_week"],
      last_activity: Date.now(),
      join_date: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      weekly_savings: [8.2, 12.1, 15.3, 9.7, 11.8, 14.2, 13.5],
      monthly_rank: 0,
      all_time_rank: 0,
    };

    this.entries.set("current_user", this.userEntry);
    this.calculateRankings();
  }

  private generateMockAchievements(
    totalSaved: number,
    streak: number
  ): string[] {
    const achievements: string[] = [];

    if (totalSaved >= 1) achievements.push("first_save");
    if (totalSaved >= 50) achievements.push("carbon_saver");
    if (totalSaved >= 200) achievements.push("eco_warrior");
    if (totalSaved >= 500) achievements.push("climate_champion");

    if (streak >= 7) achievements.push("consistent_week");
    if (streak >= 30) achievements.push("monthly_master");

    // Random special achievements
    if (Math.random() < 0.3) achievements.push("transport_optimizer");
    if (Math.random() < 0.2) achievements.push("shopping_sage");
    if (Math.random() < 0.1) achievements.push("perfect_week");

    return achievements;
  }

  private generateWeeklySavings(): number[] {
    return Array.from(
      { length: 7 },
      () => Math.round((5 + Math.random() * 10) * 10) / 10
    );
  }

  private calculateRankings() {
    const sortedEntries = Array.from(this.entries.values()).sort(
      (a, b) => b.total_co2_saved - a.total_co2_saved
    );

    sortedEntries.forEach((entry, index) => {
      entry.all_time_rank = index + 1;
      this.entries.set(entry.id, entry);
    });

    // Calculate monthly rankings based on recent activity
    const recentEntries = sortedEntries
      .filter(
        (entry) => Date.now() - entry.last_activity < 30 * 24 * 60 * 60 * 1000
      )
      .sort((a, b) => {
        const aWeeklyTotal = a.weekly_savings.reduce(
          (sum, val) => sum + val,
          0
        );
        const bWeeklyTotal = b.weekly_savings.reduce(
          (sum, val) => sum + val,
          0
        );
        return bWeeklyTotal - aWeeklyTotal;
      });

    recentEntries.forEach((entry, index) => {
      entry.monthly_rank = index + 1;
      this.entries.set(entry.id, entry);
    });
  }

  getLeaderboard(
    type: "all_time" | "monthly" = "all_time",
    limit: number = 10
  ): LeaderboardEntry[] {
    const sortKey = type === "all_time" ? "all_time_rank" : "monthly_rank";

    return Array.from(this.entries.values())
      .filter((entry) => entry[sortKey] > 0)
      .sort((a, b) => a[sortKey] - b[sortKey])
      .slice(0, limit);
  }

  getUserRank(
    userId: string = "current_user"
  ): { all_time: number; monthly: number } | null {
    const entry = this.entries.get(userId);
    if (!entry) return null;

    return {
      all_time: entry.all_time_rank,
      monthly: entry.monthly_rank,
    };
  }

  updateUserProgress(co2Saved: number, category: string = "general") {
    if (!this.userEntry) return;

    this.userEntry.total_co2_saved += co2Saved;
    this.userEntry.last_activity = Date.now();

    // Update weekly savings (add to current day)
    const today = new Date().getDay();
    this.userEntry.weekly_savings[today] += co2Saved;

    // Check for new achievements
    const newAchievements = this.checkAchievements(this.userEntry);

    // Update streak (simplified logic)
    const daysSinceLastActivity = Math.floor(
      (Date.now() - this.userEntry.last_activity) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceLastActivity <= 1) {
      this.userEntry.current_streak = Math.max(
        this.userEntry.current_streak,
        daysSinceLastActivity === 0
          ? this.userEntry.current_streak
          : this.userEntry.current_streak + 1
      );
      this.userEntry.longest_streak = Math.max(
        this.userEntry.longest_streak,
        this.userEntry.current_streak
      );
    } else if (daysSinceLastActivity > 1) {
      this.userEntry.current_streak = 1; // Reset streak
    }

    this.entries.set("current_user", this.userEntry);
    this.calculateRankings();

    return {
      newAchievements,
      currentRank: this.getUserRank(),
      totalSaved: this.userEntry.total_co2_saved,
      currentStreak: this.userEntry.current_streak,
    };
  }

  private checkAchievements(entry: LeaderboardEntry): Achievement[] {
    const newAchievements: Achievement[] = [];

    this.achievements.forEach((achievement) => {
      if (entry.achievements.includes(achievement.id)) return; // Already has this achievement

      let earned = false;

      switch (achievement.criteria.type) {
        case "co2_saved":
          earned =
            entry.total_co2_saved >= (achievement.criteria.threshold || 0);
          break;
        case "streak":
          earned =
            entry.longest_streak >= (achievement.criteria.threshold || 0);
          break;
        case "category":
          // This would require category-specific tracking in a real implementation
          earned = Math.random() < 0.1; // Mock 10% chance
          break;
        case "special":
          // Handle special conditions
          if (achievement.criteria.special_condition === "early_adopter") {
            earned = entry.join_date < Date.now() - 60 * 24 * 60 * 60 * 1000; // Joined more than 60 days ago
          }
          break;
      }

      if (earned) {
        entry.achievements.push(achievement.id);
        newAchievements.push(achievement);
      }
    });

    return newAchievements;
  }

  getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  getUserAchievements(userId: string = "current_user"): Achievement[] {
    const entry = this.entries.get(userId);
    if (!entry) return [];

    return entry.achievements
      .map((id) => this.achievements.get(id))
      .filter((achievement) => achievement !== undefined) as Achievement[];
  }

  getLeaderboardStats(): LeaderboardStats {
    const entries = Array.from(this.entries.values());
    const totalSaved = entries.reduce(
      (sum, entry) => sum + entry.total_co2_saved,
      0
    );
    const topStreak = Math.max(...entries.map((entry) => entry.longest_streak));
    const totalAchievements = entries.reduce(
      (sum, entry) => sum + entry.achievements.length,
      0
    );

    return {
      total_participants: entries.length,
      total_co2_saved: Math.round(totalSaved * 10) / 10,
      average_savings: Math.round((totalSaved / entries.length) * 10) / 10,
      top_streak: topStreak,
      most_active_day: "Monday", // Mock data
      achievements_unlocked: totalAchievements,
    };
  }

  generateShareableCard(userId: string = "current_user"): string {
    const entry = this.entries.get(userId);
    if (!entry) return "";

    const achievements = this.getUserAchievements(userId);
    const rank = this.getUserRank(userId);

    return `🌱 Green Twin Achievement Card 🌱

${entry.anonymous_name}
🏆 Rank #${rank?.all_time || "N/A"} (All Time)
💚 ${entry.total_co2_saved}kg CO₂ Saved
🔥 ${entry.current_streak} Day Streak
🎖️ ${achievements.length} Achievements Unlocked

Recent Achievements:
${achievements
  .slice(-3)
  .map((a) => `${a.icon} ${a.name}`)
  .join("\n")}

Join me in fighting climate change with Green Twin!`;
  }

  // Mock method for demo - in real app would sync with server
  async syncWithServer(): Promise<void> {
    console.log("Green Twin: Syncing leaderboard with server...");
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Green Twin: Leaderboard synced successfully");
  }
}
