interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: string;
  timestamp: number;
  errorMessage?: string;
}

interface ConversationMetrics {
  conversationId: string;
  userId: string;
  messageCount: number;
  duration: number;
  tokensUsed: number;
  factChecksPerformed: number;
  toolsRecommended: number;
  userSatisfaction?: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetrics[] = [];
  private conversationMetrics: ConversationMetrics[] = [];
  private readonly maxMetricsHistory = 10000;

  // Track API performance
  trackAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    errorMessage?: string
  ): void {
    const metric: APIMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      userId,
      timestamp: Date.now(),
      errorMessage,
    };

    this.apiMetrics.push(metric);
    this.cleanupMetrics();

    // Log performance issues
    if (responseTime > 5000) {
      console.warn(`Slow API response: ${endpoint} took ${responseTime}ms`);
    }

    if (statusCode >= 400) {
      console.error(
        `API error: ${endpoint} returned ${statusCode}`,
        errorMessage
      );
    }
  }

  // Track conversation performance
  trackConversation(metrics: ConversationMetrics): void {
    this.conversationMetrics.push(metrics);
    this.cleanupMetrics();

    // Log conversation insights
    if (metrics.duration > 30 * 60 * 1000) {
      // 30 minutes
      console.info(
        `Long conversation: ${metrics.conversationId} lasted ${Math.round(metrics.duration / 60000)} minutes`
      );
    }

    if (metrics.tokensUsed > 8000) {
      console.warn(
        `High token usage: ${metrics.conversationId} used ${metrics.tokensUsed} tokens`
      );
    }
  }

  // Track custom performance metrics
  trackMetric(
    name: string,
    value: number,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      userId,
      metadata,
    };

    this.metrics.push(metric);
    this.cleanupMetrics();
  }

  // Get API performance statistics
  getAPIStats(timeRangeMs: number = 24 * 60 * 60 * 1000): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequestRate: number;
    endpointStats: Record<
      string,
      {
        requests: number;
        averageResponseTime: number;
        errorRate: number;
      }
    >;
  } {
    const cutoff = Date.now() - timeRangeMs;
    const recentMetrics = this.apiMetrics.filter((m) => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequestRate: 0,
        endpointStats: {},
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorCount = recentMetrics.filter((m) => m.statusCode >= 400).length;
    const slowRequestCount = recentMetrics.filter(
      (m) => m.responseTime > 3000
    ).length;

    // Calculate per-endpoint statistics
    const endpointStats: Record<
      string,
      {
        requests: number;
        averageResponseTime: number;
        errorRate: number;
      }
    > = {};

    for (const metric of recentMetrics) {
      if (!endpointStats[metric.endpoint]) {
        endpointStats[metric.endpoint] = {
          requests: 0,
          averageResponseTime: 0,
          errorRate: 0,
        };
      }

      const stats = endpointStats[metric.endpoint];
      stats.requests += 1;
      stats.averageResponseTime =
        (stats.averageResponseTime * (stats.requests - 1) +
          metric.responseTime) /
        stats.requests;

      if (metric.statusCode >= 400) {
        stats.errorRate =
          (stats.errorRate * (stats.requests - 1) + 1) / stats.requests;
      } else {
        stats.errorRate =
          (stats.errorRate * (stats.requests - 1)) / stats.requests;
      }
    }

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: errorCount / totalRequests,
      slowRequestRate: slowRequestCount / totalRequests,
      endpointStats,
    };
  }

  // Get conversation analytics
  getConversationStats(timeRangeMs: number = 24 * 60 * 60 * 1000): {
    totalConversations: number;
    averageDuration: number;
    averageMessages: number;
    averageTokens: number;
    totalFactChecks: number;
    totalToolRecommendations: number;
    averageSatisfaction?: number;
  } {
    const cutoff = Date.now() - timeRangeMs;
    const recentConversations = this.conversationMetrics.filter(
      (m) => m.timestamp > cutoff
    );

    if (recentConversations.length === 0) {
      return {
        totalConversations: 0,
        averageDuration: 0,
        averageMessages: 0,
        averageTokens: 0,
        totalFactChecks: 0,
        totalToolRecommendations: 0,
      };
    }

    const totalConversations = recentConversations.length;
    const averageDuration =
      recentConversations.reduce((sum, c) => sum + c.duration, 0) /
      totalConversations;
    const averageMessages =
      recentConversations.reduce((sum, c) => sum + c.messageCount, 0) /
      totalConversations;
    const averageTokens =
      recentConversations.reduce((sum, c) => sum + c.tokensUsed, 0) /
      totalConversations;
    const totalFactChecks = recentConversations.reduce(
      (sum, c) => sum + c.factChecksPerformed,
      0
    );
    const totalToolRecommendations = recentConversations.reduce(
      (sum, c) => sum + c.toolsRecommended,
      0
    );

    const satisfactionRatings = recentConversations
      .filter((c) => c.userSatisfaction !== undefined)
      .map((c) => c.userSatisfaction!);

    const averageSatisfaction =
      satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((sum, rating) => sum + rating, 0) /
          satisfactionRatings.length
        : undefined;

    return {
      totalConversations,
      averageDuration: Math.round(averageDuration),
      averageMessages: Math.round(averageMessages * 10) / 10,
      averageTokens: Math.round(averageTokens),
      totalFactChecks,
      totalToolRecommendations,
      averageSatisfaction: averageSatisfaction
        ? Math.round(averageSatisfaction * 10) / 10
        : undefined,
    };
  }

  // Get system health metrics
  getSystemHealth(): {
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
    uptime: number;
    memoryUsage?: number;
  } {
    const apiStats = this.getAPIStats(60 * 60 * 1000); // Last hour
    const issues: string[] = [];
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    // Check API performance
    if (apiStats.errorRate > 0.1) {
      // More than 10% error rate
      issues.push(`High error rate: ${(apiStats.errorRate * 100).toFixed(1)}%`);
      status = "degraded";
    }

    if (apiStats.averageResponseTime > 3000) {
      // Average response time > 3s
      issues.push(
        `Slow response times: ${apiStats.averageResponseTime}ms average`
      );
      status = status === "healthy" ? "degraded" : "unhealthy";
    }

    if (apiStats.slowRequestRate > 0.2) {
      // More than 20% slow requests
      issues.push(
        `High slow request rate: ${(apiStats.slowRequestRate * 100).toFixed(1)}%`
      );
      status = status === "healthy" ? "degraded" : status;
    }

    // Check memory usage if available
    let memoryUsage: number | undefined;
    if (typeof process !== "undefined" && process.memoryUsage) {
      const memory = process.memoryUsage();
      memoryUsage = memory.heapUsed / memory.heapTotal;

      if (memoryUsage > 0.9) {
        // More than 90% memory usage
        issues.push(`High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
        status = "unhealthy";
      }
    }

    return {
      status,
      issues,
      uptime: process.uptime ? process.uptime() * 1000 : 0,
      memoryUsage,
    };
  }

  // Get performance dashboard data
  getDashboardData() {
    const apiStats = this.getAPIStats();
    const conversationStats = this.getConversationStats();
    const systemHealth = this.getSystemHealth();

    // Get recent errors
    const recentErrors = this.apiMetrics
      .filter(
        (m) =>
          m.statusCode >= 400 && m.timestamp > Date.now() - 24 * 60 * 60 * 1000
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // Get top endpoints by request count
    const topEndpoints = Object.entries(apiStats.endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        requests: stats.requests,
        avgResponseTime: stats.averageResponseTime,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      apiStats,
      conversationStats,
      systemHealth,
      recentErrors,
      topEndpoints,
    };
  }

  // Clean up old metrics to prevent memory leaks
  private cleanupMetrics(): void {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // Keep 7 days of data

    this.metrics = this.metrics
      .filter((m) => m.timestamp > cutoff)
      .slice(-this.maxMetricsHistory);
    this.apiMetrics = this.apiMetrics
      .filter((m) => m.timestamp > cutoff)
      .slice(-this.maxMetricsHistory);
    this.conversationMetrics = this.conversationMetrics
      .filter((m) => m.timestamp > cutoff)
      .slice(-this.maxMetricsHistory);
  }

  // Export metrics for external monitoring systems
  exportMetrics(): {
    metrics: PerformanceMetric[];
    apiMetrics: APIMetrics[];
    conversationMetrics: ConversationMetrics[];
  } {
    return {
      metrics: [...this.metrics],
      apiMetrics: [...this.apiMetrics],
      conversationMetrics: [...this.conversationMetrics],
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility function to measure execution time
export function measureTime<T>(
  fn: () => T | Promise<T>,
  name: string,
  userId?: string
): T | Promise<T> {
  const start = Date.now();

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = Date.now() - start;
        performanceMonitor.trackMetric(name, duration, userId, {
          type: "execution_time",
        });
      });
    } else {
      const duration = Date.now() - start;
      performanceMonitor.trackMetric(name, duration, userId, {
        type: "execution_time",
      });
      return result;
    }
  } catch (error) {
    const duration = Date.now() - start;
    performanceMonitor.trackMetric(name, duration, userId, {
      type: "execution_time",
      error: true,
    });
    throw error;
  }
}
