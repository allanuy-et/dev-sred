export interface NarrativeUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
}

export interface NarrativeResponse {
  narrative: string
  model: string
  /** How many labour entries (with non-empty notes) were used as source. */
  sourceLabourCount: number
  usage: NarrativeUsage
}
