
import { GoogleGenAI, Type } from "@google/genai";
import { VectorAnalysis, Entity, ComparisonResult } from "../types";

export class GeminiService {
  private getAi() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  }

  async analyzeSearch(query: string, results: Entity[]): Promise<VectorAnalysis> {
    const ai = this.getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a semantic vector analysis on:
      Query: "${query}"
      Results: ${JSON.stringify(results.map(r => ({ label: r.label, desc: r.description })))}
      
      Task:
      1. Explain the deep semantic connections between these items.
      2. Group them into distinct logical clusters.
      3. Provide a high-performance SPARQL query for the Wikidata Query Service that would find similar entities based on shared properties discovered here.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            semanticClusters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  entities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  description: { type: Type.STRING }
                },
                required: ["name", "entities", "description"]
              }
            },
            sparqlSuggestion: { type: Type.STRING }
          },
          required: ["summary", "semanticClusters"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  }

  async getEntityInsights(entity: Entity) {
    const ai = this.getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Provide an advanced semantic profile for the entity "${entity.label}" (${entity.description}).
      Focus on its ontological role and its most statistically significant neighbors in the global knowledge graph.
      Include recent context or news using Google Search.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  }

  async compareEntities(entityA: Entity, entityB: Entity): Promise<ComparisonResult> {
    const ai = this.getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the semantic bridge between these two Wikidata entities:
      Entity A: ${entityA.label} (${entityA.description})
      Entity B: ${entityB.label} (${entityB.description})
      
      Determine their shared semantic space and where they diverge in the knowledge graph.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commonGround: { type: Type.STRING },
            divergence: { type: Type.STRING },
            semanticDistance: { type: Type.STRING, description: "A creative qualitative description of how 'far' they are conceptually." },
            influence: { type: Type.STRING, description: "How one influenced the other or how they coexist in the same domain." }
          },
          required: ["commonGround", "divergence", "semanticDistance", "influence"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  }
}
