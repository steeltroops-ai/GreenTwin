interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  userId?: string;
  endpoint?: string;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
  context?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface ErrorPattern {
  pattern: RegExp;
  severity: ErrorLog["severity"];
  category: string;
  suggestedAction?: string;
}

export class ErrorHandler {
  private errors: ErrorLog[] = [];
  private readonly maxErrorHistory = 5000;
  
  // Common error patterns for classification
  private readonly errorPatterns: ErrorPattern[] = [
    {
      pattern: /rate limit/i,
      severity: "medium",
      category: "rate_limiting",
      suggestedAction: "Implement exponential backoff or reduce request frequency",
    },
    {
      pattern: /quota.*exceeded/i,
      severity: "high",
      category: "quota_exceeded",
      suggestedAction: "Check API quota limits and usage patterns",
    },
    {
      pattern: /authentication.*failed|unauthorized/i,
      severity: "high",
      category: "authentication",
      suggestedAction: "Verify API keys and authentication tokens",
    },
    {
      pattern: /network.*error|connection.*failed/i,
      severity: "medium",
      category: "network",
      suggestedAction: "Check network connectivity and retry with exponential backoff",
    },
    {
      pattern: /timeout/i,
      severity: "medium",
      category: "timeout",
      suggestedAction: "Increase timeout values or optimize request processing",
    },
    {
      pattern: /out of memory|memory.*exceeded/i,
      severity: "critical",
      category: "memory",
      suggestedAction: "Investigate memory leaks and optimize memory usage",
    },
    {
      pattern: /database.*error|sql.*error/i,
      severity: "high",
      category: "database",
      suggestedAction: "Check database connectivity and query performance",
    },
    {
      pattern: /validation.*error|invalid.*input/i,
      severity: "low",
      category: "validation",
      suggestedAction: "Improve input validation and user feedback",
    },
  ];

  // Log an error with automatic classification
  logError(
    error: Error | string,
    userId?: string,
    endpoint?: string,
    context?: Record<string, any>
  ): string {
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorStack = typeof error === "string" ? undefined : error.stack;
    
    const classification = this.classifyError(errorMessage);
    
    const errorLog: ErrorLog = {
      id: this.generateErrorId(),
      message: errorMessage,
      stack: errorStack,
      userId,
      endpoint,
      timestamp: Date.now(),
      severity: classification.severity,
      context: {
        ...context,
        category: classification.category,
        suggestedAction: classification.suggestedAction,
      },
      resolved: false,
    };

    this.errors.push(errorLog);
    this.cleanupErrors();

    // Log to console based on severity
    this.logToConsole(errorLog);

    // Trigger alerts for critical errors
    if (errorLog.severity === "critical") {
      this.triggerCriticalAlert(errorLog);
    }

    return errorLog.id;
  }

  // Classify error based on patterns
  private classifyError(message: string): {
    severity: ErrorLog["severity"];
    category: string;
    suggestedAction?: string;
  } {
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(message)) {
        return {
          severity: pattern.severity,
          category: pattern.category,
          suggestedAction: pattern.suggestedAction,
        };
      }
    }

    // Default classification for unknown errors
    return {
      severity: "medium",
      category: "unknown",
      suggestedAction: "Investigate error details and context",
    };
  }

  // Mark error as resolved
  resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = Date.now();
    error.resolvedBy = resolvedBy;

    return true;
  }

  // Get error statistics
  getErrorStats(timeRangeMs: number = 24 * 60 * 60 * 1000): {
    totalErrors: number;
    errorsBySeverity: Record<ErrorLog["severity"], number>;
    errorsByCategory: Record<string, number>;
    errorRate: number;
    topErrors: Array<{ message: string; count: number; severity: ErrorLog["severity"] }>;
    unresolvedErrors: number;
  } {
    const cutoff = Date.now() - timeRangeMs;
    const recentErrors = this.errors.filter(e => e.timestamp > cutoff);

    const errorsBySeverity: Record<ErrorLog["severity"], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const errorsByCategory: Record<string, number> = {};
    const errorCounts: Record<string, { count: number; severity: ErrorLog["severity"] }> = {};

    for (const error of recentErrors) {
      errorsBySeverity[error.severity]++;
      
      const category = error.context?.category || "unknown";
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
      
      if (!errorCounts[error.message]) {
        errorCounts[error.message] = { count: 0, severity: error.severity };
      }
      errorCounts[error.message].count++;
    }

    const topErrors = Object.entries(errorCounts)
      .map(([message, data]) => ({ message, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const unresolvedErrors = recentErrors.filter(e => !e.resolved).length;
    const errorRate = recentErrors.length / (timeRangeMs / (60 * 60 * 1000)); // Errors per hour

    return {
      totalErrors: recentErrors.length,
      errorsBySeverity,
      errorsByCategory,
      errorRate,
      topErrors,
      unresolvedErrors,
    };
  }

  // Get recent errors
  getRecentErrors(limit: number = 50, severity?: ErrorLog["severity"]): ErrorLog[] {
    let filteredErrors = this.errors;
    
    if (severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === severity);
    }

    return filteredErrors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get errors by user
  getUserErrors(userId: string, limit: number = 20): ErrorLog[] {
    return this.errors
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get error trends
  getErrorTrends(timeRangeMs: number = 7 * 24 * 60 * 60 * 1000): Array<{
    timestamp: number;
    errorCount: number;
    criticalCount: number;
  }> {
    const cutoff = Date.now() - timeRangeMs;
    const recentErrors = this.errors.filter(e => e.timestamp > cutoff);
    
    // Group errors by hour
    const hourlyData: Record<number, { errorCount: number; criticalCount: number }> = {};
    
    for (const error of recentErrors) {
      const hour = Math.floor(error.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = { errorCount: 0, criticalCount: 0 };
      }
      
      hourlyData[hour].errorCount++;
      if (error.severity === "critical") {
        hourlyData[hour].criticalCount++;
      }
    }

    return Object.entries(hourlyData)
      .map(([timestamp, data]) => ({
        timestamp: parseInt(timestamp),
        errorCount: data.errorCount,
        criticalCount: data.criticalCount,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Generate error report
  generateErrorReport(timeRangeMs: number = 24 * 60 * 60 * 1000): string {
    const stats = this.getErrorStats(timeRangeMs);
    const timeRangeHours = timeRangeMs / (60 * 60 * 1000);

    return `Error Report (Last ${timeRangeHours}h):
• Total Errors: ${stats.totalErrors}
• Error Rate: ${stats.errorRate.toFixed(1)} errors/hour
• Unresolved: ${stats.unresolvedErrors}

Severity Breakdown:
• Critical: ${stats.errorsBySeverity.critical}
• High: ${stats.errorsBySeverity.high}
• Medium: ${stats.errorsBySeverity.medium}
• Low: ${stats.errorsBySeverity.low}

Top Error Categories:
${Object.entries(stats.errorsByCategory)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([category, count]) => `• ${category}: ${count}`)
  .join('\n')}

Most Frequent Errors:
${stats.topErrors
  .slice(0, 3)
  .map(error => `• ${error.message.substring(0, 60)}... (${error.count}x, ${error.severity})`)
  .join('\n')}`;
  }

  // Log to console with appropriate level
  private logToConsole(error: ErrorLog): void {
    const logMessage = `[${error.severity.toUpperCase()}] ${error.message}`;
    const logContext = {
      errorId: error.id,
      userId: error.userId,
      endpoint: error.endpoint,
      context: error.context,
    };

    switch (error.severity) {
      case "critical":
        console.error(logMessage, logContext);
        if (error.stack) console.error(error.stack);
        break;
      case "high":
        console.error(logMessage, logContext);
        break;
      case "medium":
        console.warn(logMessage, logContext);
        break;
      case "low":
        console.info(logMessage, logContext);
        break;
    }
  }

  // Trigger critical error alerts
  private triggerCriticalAlert(error: ErrorLog): void {
    // In production, this would integrate with alerting systems like PagerDuty, Slack, etc.
    console.error("🚨 CRITICAL ERROR ALERT 🚨", {
      errorId: error.id,
      message: error.message,
      userId: error.userId,
      endpoint: error.endpoint,
      timestamp: new Date(error.timestamp).toISOString(),
    });
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Clean up old errors
  private cleanupErrors(): void {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // Keep 30 days
    this.errors = this.errors
      .filter(e => e.timestamp > cutoff)
      .slice(-this.maxErrorHistory);
  }

  // Export errors for external monitoring
  exportErrors(): ErrorLog[] {
    return [...this.errors];
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Utility function to wrap async functions with error handling
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorId = errorHandler.logError(
        error instanceof Error ? error : new Error(String(error)),
        context?.userId,
        context?.endpoint,
        context
      );
      
      // Re-throw with error ID for tracking
      const enhancedError = error instanceof Error ? error : new Error(String(error));
      (enhancedError as any).errorId = errorId;
      throw enhancedError;
    }
  };
}
