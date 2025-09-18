import { CoachingPrompt } from "./types";

// Base system prompt for the AI coach
export const SYSTEM_PROMPT = `You are Green Twin AI, an expert environmental coach and carbon footprint advisor with deep expertise in climate science, sustainability, and behavioral change. Your mission is to help users reduce their carbon footprint through personalized, actionable advice.

## Core Identity & Expertise
- **Role**: Personal carbon footprint coach and environmental advisor
- **Expertise**: Climate science, carbon accounting, sustainable living, behavioral psychology
- **Personality**: Encouraging, knowledgeable, practical, and solution-focused
- **Communication Style**: Clear, actionable, and scientifically accurate

## Key Capabilities
1. **Carbon Footprint Analysis**: Calculate and analyze personal, product, and activity carbon footprints
2. **Myth-Busting**: Debunk climate misinformation with credible scientific sources
3. **Sustainable Alternatives**: Recommend eco-friendly swaps with quantified impact
4. **Behavioral Change**: Guide users through sustainable habit formation
5. **Product Analysis**: Evaluate environmental impact of products and services
6. **Action Planning**: Create personalized carbon reduction strategies

## Response Guidelines
- Always provide specific numbers (CO2e savings, costs, timeframes)
- Include actionable next steps in every response
- Cite credible sources for factual claims
- Quantify environmental impact when possible
- Suggest relevant tools, apps, or resources
- Maintain an encouraging, non-judgmental tone
- Focus on practical, achievable changes

## Knowledge Base
- Latest IPCC reports and climate science
- Carbon footprint calculation methodologies
- Sustainable technology and products
- Behavioral change psychology
- Environmental policy and regulations
- Green energy and efficiency solutions

Remember: Every conversation is an opportunity to create positive environmental impact. Be specific, be helpful, and be encouraging.`;

// Specialized coaching prompts for different scenarios
export const COACHING_PROMPTS: CoachingPrompt[] = [
  {
    id: "carbon_analysis",
    name: "Carbon Footprint Analysis",
    category: "carbon_reduction",
    template: `Analyze the carbon footprint of: {activity_or_product}

Please provide:
1. **Estimated CO2e emissions** (with calculation methodology)
2. **Key contributing factors** to the carbon footprint
3. **Comparison to alternatives** (at least 2-3 options)
4. **Specific reduction strategies** with quantified savings
5. **Implementation timeline** and difficulty level
6. **Cost implications** (savings or additional costs)

Use the latest carbon intensity factors and lifecycle assessment data. Be specific with numbers and cite sources where possible.`,
    variables: ["activity_or_product"],
    expectedOutputFormat: "structured",
  },
  {
    id: "myth_busting",
    name: "Climate Myth Debunking",
    category: "myth_busting",
    template: `Fact-check this environmental claim: "{claim}"

Please provide:
1. **Verdict**: Accurate, Inaccurate, Partially Accurate, or Unverifiable
2. **Confidence Level**: 0-100% based on available evidence
3. **Scientific Explanation**: What the research actually shows
4. **Credible Sources**: Peer-reviewed studies, authoritative reports
5. **Context & Nuances**: Important caveats or considerations
6. **Actionable Takeaway**: What this means for personal carbon reduction

Base your analysis on peer-reviewed research, IPCC reports, and authoritative scientific institutions.`,
    variables: ["claim"],
    expectedOutputFormat: "analytical",
  },
  {
    id: "product_swap",
    name: "Sustainable Product Alternatives",
    category: "product_analysis",
    template: `Find sustainable alternatives to: {product_description}

Please provide:
1. **Current Product Impact**: Estimated carbon footprint and environmental concerns
2. **Top 3 Alternatives**: Ranked by environmental benefit
3. **Impact Comparison**: CO2e savings, resource use, waste reduction
4. **Cost Analysis**: Upfront costs vs. long-term savings
5. **Availability & Accessibility**: Where to find these alternatives
6. **Quality & Performance**: How alternatives compare functionally
7. **Implementation Tips**: How to make the switch successfully

Focus on practical, accessible alternatives that deliver meaningful environmental benefits.`,
    variables: ["product_description"],
    expectedOutputFormat: "structured",
  },
  {
    id: "behavior_change",
    name: "Sustainable Habit Formation",
    category: "behavior_change",
    template: `Help me develop this sustainable habit: {desired_habit}

Please provide:
1. **Environmental Impact**: Potential CO2e savings and other benefits
2. **Habit Formation Strategy**: Step-by-step implementation plan
3. **Behavioral Psychology**: Why this habit is challenging and how to overcome barriers
4. **Tracking Methods**: How to measure progress and impact
5. **Motivation Techniques**: Ways to stay committed long-term
6. **Common Pitfalls**: What to watch out for and how to recover
7. **Community & Support**: Resources, apps, or groups that can help

Use evidence-based behavior change techniques and provide a realistic timeline.`,
    variables: ["desired_habit"],
    expectedOutputFormat: "conversational",
  },
  {
    id: "action_planning",
    name: "Personal Carbon Reduction Plan",
    category: "carbon_reduction",
    template: `Create a personalized carbon reduction plan for: {user_context}

Please provide:
1. **Current Footprint Assessment**: Estimated baseline emissions
2. **Priority Areas**: Top 3-5 areas with highest impact potential
3. **Quick Wins**: Immediate actions (0-30 days) with 2-5 kg CO2e savings
4. **Medium-term Goals**: 3-6 month targets with 10-50 kg CO2e savings
5. **Long-term Vision**: 1-2 year goals with 100+ kg CO2e savings
6. **Implementation Roadmap**: Month-by-month action plan
7. **Progress Tracking**: KPIs and measurement methods
8. **Resource Requirements**: Budget, time, and effort needed

Tailor recommendations to the user's lifestyle, location, and constraints.`,
    variables: ["user_context"],
    expectedOutputFormat: "structured",
  },
  {
    id: "commute_optimization",
    name: "Transportation Carbon Optimization",
    category: "carbon_reduction",
    template: `Optimize the carbon footprint of this commute: {commute_details}

Please provide:
1. **Current Emissions**: Calculate CO2e for existing transportation
2. **Alternative Options**: Public transit, cycling, walking, carpooling, remote work
3. **Emissions Comparison**: CO2e savings for each alternative
4. **Cost-Benefit Analysis**: Financial implications of each option
5. **Practical Considerations**: Time, convenience, weather, safety factors
6. **Hybrid Approach**: Combining multiple transportation modes
7. **Implementation Strategy**: How to transition to lower-carbon options

Consider local infrastructure, seasonal variations, and personal constraints.`,
    variables: ["commute_details"],
    expectedOutputFormat: "structured",
  },
  {
    id: "diet_impact",
    name: "Dietary Carbon Footprint Analysis",
    category: "carbon_reduction",
    template: `Analyze the carbon impact of this diet/meal: {diet_description}

Please provide:
1. **Current Footprint**: Estimated CO2e emissions per meal/week/month
2. **Key Contributors**: Which foods have the highest carbon impact
3. **Sustainable Swaps**: Lower-carbon alternatives for high-impact items
4. **Nutritional Balance**: Ensuring health while reducing emissions
5. **Seasonal & Local Options**: How to choose climate-friendly foods
6. **Preparation Methods**: Cooking techniques that reduce energy use
7. **Food Waste Reduction**: Strategies to minimize waste and emissions

Provide specific CO2e numbers and practical meal planning advice.`,
    variables: ["diet_description"],
    expectedOutputFormat: "structured",
  },
  {
    id: "home_energy",
    name: "Home Energy Efficiency Assessment",
    category: "carbon_reduction",
    template: `Assess and improve home energy efficiency for: {home_description}

Please provide:
1. **Current Energy Profile**: Estimated consumption and emissions
2. **Efficiency Opportunities**: Ranked by impact and cost-effectiveness
3. **Renewable Energy Options**: Solar, wind, or green energy programs
4. **Smart Technology**: Thermostats, appliances, and monitoring systems
5. **Behavioral Changes**: Daily habits that reduce energy use
6. **Investment Analysis**: Costs, payback periods, and long-term savings
7. **Implementation Priority**: What to tackle first for maximum impact

Consider local climate, energy costs, and available incentives.`,
    variables: ["home_description"],
    expectedOutputFormat: "structured",
  },
];

// Context-aware prompt enhancement
export function enhancePromptWithContext(
  basePrompt: string,
  userContext: {
    location?: string;
    lifestyle?: string;
    carbonGoals?: number;
    previousTopics?: string[];
    communicationStyle?: "casual" | "professional" | "technical";
  }
): string {
  let enhancedPrompt = basePrompt;

  // Add location context
  if (userContext.location) {
    enhancedPrompt += `\n\nUser Location: ${userContext.location}
Consider local climate, infrastructure, energy grid, and available services in your recommendations.`;
  }

  // Add lifestyle context
  if (userContext.lifestyle) {
    enhancedPrompt += `\n\nUser Lifestyle: ${userContext.lifestyle}
Tailor recommendations to fit their current lifestyle and constraints.`;
  }

  // Add carbon goals
  if (userContext.carbonGoals) {
    enhancedPrompt += `\n\nUser's Carbon Reduction Goal: ${userContext.carbonGoals} kg CO2e
Frame recommendations in terms of progress toward this goal.`;
  }

  // Add conversation history context
  if (userContext.previousTopics && userContext.previousTopics.length > 0) {
    enhancedPrompt += `\n\nPrevious Discussion Topics: ${userContext.previousTopics.join(", ")}
Build on previous conversations and avoid repeating information unless requested.`;
  }

  // Adjust communication style
  if (userContext.communicationStyle) {
    const styleInstructions = {
      casual: "Use a friendly, conversational tone with everyday language and relatable examples.",
      professional: "Maintain a professional tone with clear structure and business-relevant examples.",
      technical: "Use precise technical language with detailed methodologies and scientific references.",
    };
    
    enhancedPrompt += `\n\nCommunication Style: ${styleInstructions[userContext.communicationStyle]}`;
  }

  return enhancedPrompt;
}

// Generate dynamic prompts based on user input
export function generateContextualPrompt(
  userInput: string,
  conversationHistory: string[] = []
): string {
  const input = userInput.toLowerCase();
  
  // Detect intent and generate appropriate prompt
  if (input.includes("carbon footprint") || input.includes("co2") || input.includes("emissions")) {
    return COACHING_PROMPTS.find(p => p.id === "carbon_analysis")?.template.replace("{activity_or_product}", userInput) || SYSTEM_PROMPT;
  }
  
  if (input.includes("myth") || input.includes("true") || input.includes("false") || input.includes("fact")) {
    return COACHING_PROMPTS.find(p => p.id === "myth_busting")?.template.replace("{claim}", userInput) || SYSTEM_PROMPT;
  }
  
  if (input.includes("alternative") || input.includes("swap") || input.includes("replace")) {
    return COACHING_PROMPTS.find(p => p.id === "product_swap")?.template.replace("{product_description}", userInput) || SYSTEM_PROMPT;
  }
  
  if (input.includes("habit") || input.includes("routine") || input.includes("daily")) {
    return COACHING_PROMPTS.find(p => p.id === "behavior_change")?.template.replace("{desired_habit}", userInput) || SYSTEM_PROMPT;
  }
  
  if (input.includes("plan") || input.includes("strategy") || input.includes("goal")) {
    return COACHING_PROMPTS.find(p => p.id === "action_planning")?.template.replace("{user_context}", userInput) || SYSTEM_PROMPT;
  }
  
  if (input.includes("commute") || input.includes("transport") || input.includes("travel")) {
    return COACHING_PROMPTS.find(p => p.id === "commute_optimization")?.template.replace("{commute_details}", userInput) || SYSTEM_PROMPT;
  }
  
  if (input.includes("food") || input.includes("diet") || input.includes("meal") || input.includes("eat")) {
    return COACHING_PROMPTS.find(p => p.id === "diet_impact")?.template.replace("{diet_description}", userInput) || SYSTEM_PROMPT;
  }
  
  if (input.includes("home") || input.includes("energy") || input.includes("electricity") || input.includes("heating")) {
    return COACHING_PROMPTS.find(p => p.id === "home_energy")?.template.replace("{home_description}", userInput) || SYSTEM_PROMPT;
  }
  
  // Default to general coaching
  return SYSTEM_PROMPT;
}

// Conversation flow management
export function getFollowUpQuestions(topic: string, userResponse: string): string[] {
  const followUps: Record<string, string[]> = {
    carbon_analysis: [
      "Would you like me to suggest specific alternatives with lower carbon footprints?",
      "Are you interested in creating an action plan to reduce these emissions?",
      "Would you like to explore the cost implications of making these changes?",
    ],
    myth_busting: [
      "Would you like me to explain the science behind this topic in more detail?",
      "Are there related environmental claims you'd like me to fact-check?",
      "Would you like practical advice based on what the science actually shows?",
    ],
    product_analysis: [
      "Would you like help finding where to purchase these sustainable alternatives?",
      "Are you interested in calculating the long-term cost savings?",
      "Would you like tips for making the transition to these alternatives?",
    ],
    behavior_change: [
      "Would you like me to create a specific implementation plan for this habit?",
      "Are you interested in tracking methods to measure your progress?",
      "Would you like suggestions for overcoming common obstacles?",
    ],
  };
  
  return followUps[topic] || [
    "Is there a specific aspect of this topic you'd like to explore further?",
    "Would you like me to suggest related actions you could take?",
    "Are there other environmental topics you're curious about?",
  ];
}
