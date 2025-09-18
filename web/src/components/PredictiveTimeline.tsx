"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { CarbonPredictionEngine } from "../lib/prediction-engine";

interface PredictiveTimelineProps {
  className?: string;
}

export function PredictiveTimeline({ className }: PredictiveTimelineProps) {
  const [predictionEngine, setPredictionEngine] =
    useState<CarbonPredictionEngine | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Mock historical data for demo
  const mockHistoricalData = useMemo(() => {
    const events = [];
    const now = Date.now();

    // Generate 30 days of mock data
    for (let i = 30; i >= 0; i--) {
      const dayStart = now - i * 24 * 60 * 60 * 1000;

      // Add 2-5 events per day
      const eventsPerDay = 2 + Math.floor(Math.random() * 4);

      for (let j = 0; j < eventsPerDay; j++) {
        const eventTime = dayStart + Math.random() * 24 * 60 * 60 * 1000;
        const eventTypes = ["product", "travel", "energy", "food"] as const;
        const type = eventTypes[
          Math.floor(Math.random() * eventTypes.length)
        ] as "product" | "travel" | "energy" | "food";

        let kg = 0.5 + Math.random() * 3; // 0.5-3.5 kg
        if (type === "travel") kg *= 2; // Travel has higher emissions

        events.push({
          timestamp: eventTime,
          type,
          kg: Math.round(kg * 10) / 10,
          metadata: {
            category: type,
            title: `Mock ${type} event`,
            confidence: 0.8 + Math.random() * 0.2,
          },
        });
      }
    }

    return events;
  }, []);

  useEffect(() => {
    // Initialize prediction engine with mock data
    const engine = new CarbonPredictionEngine(mockHistoricalData);
    setPredictionEngine(engine);

    // Generate predictions
    const futurePredictions = engine.predictFutureEmissions(14);
    setPredictions(futurePredictions);

    // Get data quality assessment
    const quality = engine.getDataQuality();
    setDataQuality(quality);
  }, [mockHistoricalData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous * 1.1)
      return <TrendingUp className="size-4 text-red-500" />;
    if (current < previous * 0.9)
      return <TrendingDown className="size-4 text-green-500" />;
    return <div className="size-4" />; // Stable
  };

  const selectedPrediction = predictions[selectedDay];
  const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedKg, 0);
  const averageDaily = totalPredicted / predictions.length;

  if (!predictionEngine || predictions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Predictive Carbon Timeline
          </CardTitle>
          <CardDescription>Loading AI predictions...</CardDescription>
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
          <Calendar className="size-5" />
          Predictive Carbon Timeline
        </CardTitle>
        <CardDescription>
          AI-powered predictions of your future carbon emissions
        </CardDescription>

        {dataQuality && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={dataQuality.score >= 70 ? "default" : "secondary"}>
              Prediction Quality: {dataQuality.description} ({dataQuality.score}
              %)
            </Badge>
            {dataQuality.score < 70 && (
              <AlertTriangle className="size-4 text-yellow-500" />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {Math.round(totalPredicted * 10) / 10}
            </div>
            <div className="text-sm text-muted-foreground">
              kg CO₂ (14 days)
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(averageDaily * 10) / 10}
            </div>
            <div className="text-sm text-muted-foreground">avg daily</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {
                predictions.filter(
                  (p) => p.interventionOpportunities.length > 0
                ).length
              }
            </div>
            <div className="text-sm text-muted-foreground">
              intervention days
            </div>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">14-Day Forecast</h4>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {predictions.slice(0, 14).map((prediction, index) => (
              <button
                key={prediction.date}
                onClick={() => setSelectedDay(index)}
                className={`p-2 rounded border text-center transition-colors ${
                  selectedDay === index
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                <div className="font-medium">{formatDate(prediction.date)}</div>
                <div className="text-xs mt-1">{prediction.predictedKg}kg</div>
                <div className="flex justify-center mt-1">
                  {index > 0 &&
                    getTrendIcon(
                      prediction.predictedKg,
                      predictions[index - 1].predictedKg
                    )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Details */}
        {selectedPrediction && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">
                {formatDate(selectedPrediction.date)} Prediction
              </h4>
              <Badge
                variant="outline"
                className={getConfidenceColor(selectedPrediction.confidence)}
              >
                {getConfidenceBadge(selectedPrediction.confidence)} Confidence
              </Badge>
            </div>

            {/* Emissions Breakdown */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Emissions Breakdown</div>
              <div className="space-y-1">
                {Object.entries(selectedPrediction.breakdown).map(
                  ([category, kg]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">{category}</span>
                      <span>{Math.round((kg as number) * 10) / 10}kg CO₂</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Intervention Opportunities */}
            {selectedPrediction.interventionOpportunities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="size-4 text-yellow-500" />
                  Smart Recommendations
                </div>
                <div className="space-y-2">
                  {selectedPrediction.interventionOpportunities.map(
                    (opportunity: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-background rounded text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {opportunity.description}
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">
                            Save up to{" "}
                            {Math.round(opportunity.potentialSaving * 10) / 10}
                            kg CO₂ •{opportunity.effort} effort
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(opportunity.confidence * 100)}%
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Prediction Factors */}
            {selectedPrediction.factors.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Prediction Factors</div>
                <div className="space-y-1">
                  {selectedPrediction.factors.map(
                    (factor: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{factor.name}</span>
                        <span
                          className={
                            factor.impact > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {factor.impact > 0 ? "+" : ""}
                          {Math.round(factor.impact)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Target className="mr-2 size-4" />
            Set Daily Goal
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Zap className="mr-2 size-4" />
            Enable Auto-Nudges
          </Button>
        </div>

        {/* Data Quality Recommendations */}
        {dataQuality && dataQuality.recommendations.length > 0 && (
          <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <CheckCircle className="size-4" />
              Improve Predictions
            </div>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              {dataQuality.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
