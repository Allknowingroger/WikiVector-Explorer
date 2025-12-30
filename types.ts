
export interface Entity {
  id: string;
  label: string;
  description: string;
  type: string;
  imageUrl?: string;
  relevance?: number;
  properties?: {
    prop: string;
    value: string;
  }[];
}

export interface VectorAnalysis {
  summary: string;
  semanticClusters: {
    name: string;
    entities: string[];
    description: string;
  }[];
  sparqlSuggestion?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ComparisonResult {
  commonGround: string;
  divergence: string;
  semanticDistance: string;
  influence: string;
}
