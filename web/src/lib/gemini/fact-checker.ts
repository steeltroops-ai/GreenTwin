import { geminiClient } from "./client";
import { FactCheckResult, ChatMessage } from "./types";

export class FactCheckingService {
  
  // Comprehensive fact-checking prompt
  private readonly factCheckPrompt = `You are an expert environmental fact-checker with access to the latest climate science research. Your role is to verify environmental claims with scientific rigor.

Guidelines for fact-checking:
1. Base analysis on peer-reviewed research, IPCC reports, and authoritative scientific institutions
2. Provide specific confidence levels (0-100%) based on evidence quality
3. Cite credible sources with publication dates when possible
4. Acknowledge uncertainties and ongoing scientific debates
5. Consider context and nuances that affect claim validity
6. Distinguish between correlation and causation
7. Account for regional variations and time-dependent factors

Response Format:
- **Verdict**: Accurate, Inaccurate, Partially Accurate, or Unverifiable
- **Confidence**: 0-100% based on evidence strength
- **Evidence**: Key scientific findings that support or refute the claim
- **Sources**: Specific studies, reports, or authoritative sources
- **Context**: Important nuances, limitations, or caveats
- **Implications**: What this means for personal carbon reduction efforts`;

  async factCheckClaim(
    claim: string,
    userId: string,
    context?: string
  ): Promise<FactCheckResult> {
    try {
      const factCheckMessage: ChatMessage = {
        id: `factcheck_${Date.now()}`,
        role: "user",
        content: `${this.factCheckPrompt}

CLAIM TO FACT-CHECK: "${claim}"

${context ? `ADDITIONAL CONTEXT: ${context}` : ""}

Please provide a comprehensive fact-check analysis following the specified format.`,
        timestamp: Date.now(),
        userId,
        conversationId: `factcheck_${Date.now()}`,
      };

      const response = await geminiClient.generateResponse(
        [factCheckMessage],
        userId,
        { temperature: 0.3, maxTokens: 4096 } // Lower temperature for factual accuracy
      );

      return this.parseFactCheckResponse(claim, response.content);
    } catch (error) {
      console.error("Fact-checking error:", error);
      return {
        claim,
        verdict: "unverifiable",
        confidence: 0,
        sources: [],
        explanation: "Unable to fact-check this claim due to technical difficulties. Please try again later.",
      };
    }
  }

  // Parse the AI response into structured fact-check result
  private parseFactCheckResponse(claim: string, response: string): FactCheckResult {
    const verdict = this.extractVerdict(response);
    const confidence = this.extractConfidence(response);
    const sources = this.extractSources(response);
    
    return {
      claim,
      verdict,
      confidence,
      sources,
      explanation: response,
    };
  }

  private extractVerdict(content: string): "accurate" | "inaccurate" | "partially_accurate" | "unverifiable" {
    const lower = content.toLowerCase();
    
    // Look for explicit verdict statements
    if (lower.includes("verdict: accurate") || lower.includes("verdict**: accurate")) {
      return "accurate";
    }
    if (lower.includes("verdict: inaccurate") || lower.includes("verdict**: inaccurate")) {
      return "inaccurate";
    }
    if (lower.includes("verdict: partially accurate") || lower.includes("verdict**: partially accurate")) {
      return "partially_accurate";
    }
    if (lower.includes("verdict: unverifiable") || lower.includes("verdict**: unverifiable")) {
      return "unverifiable";
    }
    
    // Fallback to keyword analysis
    const accurateKeywords = ["accurate", "correct", "true", "supported by evidence"];
    const inaccurateKeywords = ["inaccurate", "incorrect", "false", "misleading"];
    const partialKeywords = ["partially", "somewhat", "mixed evidence"];
    
    let accurateScore = 0;
    let inaccurateScore = 0;
    let partialScore = 0;
    
    accurateKeywords.forEach(keyword => {
      accurateScore += (lower.match(new RegExp(keyword, "g")) || []).length;
    });
    
    inaccurateKeywords.forEach(keyword => {
      inaccurateScore += (lower.match(new RegExp(keyword, "g")) || []).length;
    });
    
    partialKeywords.forEach(keyword => {
      partialScore += (lower.match(new RegExp(keyword, "g")) || []).length;
    });
    
    if (partialScore > 0) return "partially_accurate";
    if (inaccurateScore > accurateScore) return "inaccurate";
    if (accurateScore > 0) return "accurate";
    
    return "unverifiable";
  }

  private extractConfidence(content: string): number {
    // Look for explicit confidence statements
    const confidenceMatch = content.match(/confidence[:\s]*(\d+)%/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]);
    }
    
    // Look for confidence ranges
    const rangeMatch = content.match(/(\d+)-(\d+)%/);
    if (rangeMatch) {
      return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
    }
    
    // Fallback based on verdict keywords
    const lower = content.toLowerCase();
    if (lower.includes("high confidence") || lower.includes("very confident")) return 85;
    if (lower.includes("moderate confidence") || lower.includes("fairly confident")) return 70;
    if (lower.includes("low confidence") || lower.includes("uncertain")) return 40;
    if (lower.includes("very uncertain") || lower.includes("unclear")) return 20;
    
    return 50; // Default moderate confidence
  }

  private extractSources(content: string): Array<{ url: string; title: string; reliability: number }> {
    const sources: Array<{ url: string; title: string; reliability: number }> = [];
    
    // Extract URLs
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const urls = content.match(urlRegex) || [];
    
    // Extract DOIs
    const doiRegex = /10\.\d{4,}\/[^\s\)]+/g;
    const dois = content.match(doiRegex) || [];
    
    // Add URLs as sources
    urls.forEach(url => {
      const reliability = this.assessSourceReliability(url);
      sources.push({
        url,
        title: this.extractTitleFromContext(content, url) || "Source",
        reliability,
      });
    });
    
    // Add DOIs as sources
    dois.forEach(doi => {
      sources.push({
        url: `https://doi.org/${doi}`,
        title: "Academic Publication",
        reliability: 95, // DOIs are typically high-reliability academic sources
      });
    });
    
    // Extract known authoritative sources mentioned in text
    const authoritativeSources = [
      { name: "IPCC", url: "https://ipcc.ch", reliability: 98 },
      { name: "NASA", url: "https://nasa.gov", reliability: 95 },
      { name: "NOAA", url: "https://noaa.gov", reliability: 95 },
      { name: "EPA", url: "https://epa.gov", reliability: 90 },
      { name: "Nature", url: "https://nature.com", reliability: 95 },
      { name: "Science", url: "https://science.org", reliability: 95 },
    ];
    
    authoritativeSources.forEach(source => {
      if (content.toLowerCase().includes(source.name.toLowerCase())) {
        sources.push({
          url: source.url,
          title: source.name,
          reliability: source.reliability,
        });
      }
    });
    
    return sources.slice(0, 5); // Limit to top 5 sources
  }

  private assessSourceReliability(url: string): number {
    const domain = url.toLowerCase();
    
    // High reliability sources
    if (domain.includes("ipcc.ch")) return 98;
    if (domain.includes("nasa.gov")) return 95;
    if (domain.includes("noaa.gov")) return 95;
    if (domain.includes("epa.gov")) return 90;
    if (domain.includes("nature.com")) return 95;
    if (domain.includes("science.org")) return 95;
    if (domain.includes("doi.org")) return 90;
    if (domain.includes(".edu")) return 85;
    if (domain.includes(".gov")) return 80;
    
    // Medium reliability sources
    if (domain.includes("wikipedia.org")) return 70;
    if (domain.includes("reuters.com")) return 75;
    if (domain.includes("bbc.com")) return 75;
    if (domain.includes("theguardian.com")) return 70;
    
    // Lower reliability for commercial or unknown sources
    if (domain.includes(".com")) return 60;
    if (domain.includes(".org")) return 65;
    
    return 50; // Default reliability
  }

  private extractTitleFromContext(content: string, url: string): string | null {
    // Look for text immediately before or after the URL that might be a title
    const urlIndex = content.indexOf(url);
    if (urlIndex === -1) return null;
    
    const beforeUrl = content.substring(Math.max(0, urlIndex - 100), urlIndex);
    const afterUrl = content.substring(urlIndex + url.length, urlIndex + url.length + 100);
    
    // Look for quoted text or parenthetical text that might be a title
    const titleMatch = beforeUrl.match(/"([^"]+)"|'([^']+)'|\(([^)]+)\)/) || 
                      afterUrl.match(/"([^"]+)"|'([^']+)'|\(([^)]+)\)/);
    
    if (titleMatch) {
      return titleMatch[1] || titleMatch[2] || titleMatch[3];
    }
    
    return null;
  }

  // Batch fact-check multiple claims
  async batchFactCheck(
    claims: string[],
    userId: string,
    context?: string
  ): Promise<FactCheckResult[]> {
    const results = await Promise.allSettled(
      claims.map(claim => this.factCheckClaim(claim, userId, context))
    );
    
    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          claim: claims[index],
          verdict: "unverifiable" as const,
          confidence: 0,
          sources: [],
          explanation: "Failed to fact-check this claim due to an error.",
        };
      }
    });
  }

  // Extract potential claims from conversation for fact-checking
  extractClaimsFromMessage(message: string): string[] {
    const claims: string[] = [];
    
    // Look for definitive statements that could be fact-checked
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      
      // Skip questions and personal statements
      if (trimmed.includes("?") || 
          trimmed.toLowerCase().startsWith("i ") ||
          trimmed.toLowerCase().startsWith("my ")) {
        continue;
      }
      
      // Look for factual claim indicators
      const factualIndicators = [
        "is", "are", "causes", "reduces", "increases", "produces",
        "emits", "saves", "costs", "takes", "requires", "contains"
      ];
      
      if (factualIndicators.some(indicator => 
        trimmed.toLowerCase().includes(` ${indicator} `))) {
        claims.push(trimmed);
      }
    }
    
    return claims.slice(0, 3); // Limit to 3 claims per message
  }

  // Generate fact-check summary for a conversation
  generateFactCheckSummary(factChecks: FactCheckResult[]): string {
    if (factChecks.length === 0) return "No fact-checks performed in this conversation.";
    
    const accurate = factChecks.filter(fc => fc.verdict === "accurate").length;
    const inaccurate = factChecks.filter(fc => fc.verdict === "inaccurate").length;
    const partial = factChecks.filter(fc => fc.verdict === "partially_accurate").length;
    const unverifiable = factChecks.filter(fc => fc.verdict === "unverifiable").length;
    
    const avgConfidence = factChecks.reduce((sum, fc) => sum + fc.confidence, 0) / factChecks.length;
    
    return `Fact-Check Summary:
• Total Claims Checked: ${factChecks.length}
• Accurate: ${accurate}
• Inaccurate: ${inaccurate}
• Partially Accurate: ${partial}
• Unverifiable: ${unverifiable}
• Average Confidence: ${avgConfidence.toFixed(1)}%`;
  }
}

// Singleton instance
export const factChecker = new FactCheckingService();
