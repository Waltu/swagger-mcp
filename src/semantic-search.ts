import type { SwaggerDocument, SwaggerService } from "./types.js"
import { SwaggerVectorizer, type VectorDocument } from "./vector-store.js"

/**
 * Simple semantic search using TF-IDF and cosine similarity
 * No external dependencies required - pure TypeScript implementation
 */
export class SemanticSearch {
  private documents: Map<string, VectorDocument> = new Map()
  private documentVectors: Map<string, Map<string, number>> = new Map()
  private idf: Map<string, number> = new Map()
  private totalDocs = 0
  
  /**
   * Index a swagger document for semantic search
   */
  async indexSwagger(swagger: SwaggerDocument, service: SwaggerService): Promise<void> {
    const docs = SwaggerVectorizer.extractDocuments(swagger, service.slug)
    
    for (const doc of docs) {
      this.documents.set(doc.id, doc)
      const vector = this.createTFVector(doc.content)
      this.documentVectors.set(doc.id, vector)
    }
    
    this.totalDocs = this.documents.size
    this.calculateIDF()
  }
  
  /**
   * Search for relevant API endpoints using natural language
   */
  search(query: string, limit = 10, threshold = 0.1): VectorDocument[] {
    const queryVector = this.createTFIDFVector(query)
    
    const scores: Array<{ doc: VectorDocument; score: number }> = []
    
    for (const [id, doc] of this.documents.entries()) {
      const docVector = this.getTFIDFVector(id)
      const score = this.cosineSimilarity(queryVector, docVector)
      
      if (score >= threshold) {
        scores.push({ doc, score })
      }
    }
    
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.doc)
  }
  
  /**
   * Find similar endpoints to a given endpoint
   */
  findSimilar(documentId: string, limit = 5): VectorDocument[] {
    const targetDoc = this.documents.get(documentId)
    if (!targetDoc) return []
    
    const targetVector = this.getTFIDFVector(documentId)
    const scores: Array<{ doc: VectorDocument; score: number }> = []
    
    for (const [id, doc] of this.documents.entries()) {
      if (id === documentId) continue
      
      const docVector = this.getTFIDFVector(id)
      const score = this.cosineSimilarity(targetVector, docVector)
      scores.push({ doc, score })
    }
    
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.doc)
  }
  
  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(partialQuery: string, limit = 5): string[] {
    const tokens = this.tokenize(partialQuery.toLowerCase())
    const suggestions = new Set<string>()
    
    for (const doc of this.documents.values()) {
      const docTokens = this.tokenize(doc.content.toLowerCase())
      for (const token of docTokens) {
        if (tokens.some(t => token.startsWith(t))) {
          suggestions.add(token)
        }
      }
    }
    
    return Array.from(suggestions).slice(0, limit)
  }
  
  /**
   * Clear the search index
   */
  clear(): void {
    this.documents.clear()
    this.documentVectors.clear()
    this.idf.clear()
    this.totalDocs = 0
  }
  
  /**
   * Get statistics about the indexed content
   */
  getStats(): {
    totalDocuments: number
    totalTerms: number
    services: string[]
    endpoints: number
    schemas: number
  } {
    const services = new Set<string>()
    let endpoints = 0
    let schemas = 0
    
    for (const doc of this.documents.values()) {
      services.add(doc.metadata.service)
      if (doc.metadata.type === "endpoint") endpoints++
      if (doc.metadata.type === "schema") schemas++
    }
    
    return {
      totalDocuments: this.totalDocs,
      totalTerms: this.idf.size,
      services: Array.from(services),
      endpoints,
      schemas
    }
  }
  
  // Private helper methods
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2) // Filter out very short tokens
  }
  
  private createTFVector(text: string): Map<string, number> {
    const tokens = this.tokenize(text)
    const tf = new Map<string, number>()
    
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1)
    }
    
    // Normalize by document length
    const total = tokens.length
    for (const [token, count] of tf.entries()) {
      tf.set(token, count / total)
    }
    
    return tf
  }
  
  private calculateIDF(): void {
    const documentFrequency = new Map<string, number>()
    
    // Count document frequency for each term
    for (const vector of this.documentVectors.values()) {
      for (const token of vector.keys()) {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)
      }
    }
    
    // Calculate IDF
    for (const [token, df] of documentFrequency.entries()) {
      this.idf.set(token, Math.log(this.totalDocs / df))
    }
  }
  
  private createTFIDFVector(text: string): Map<string, number> {
    const tf = this.createTFVector(text)
    const tfidf = new Map<string, number>()
    
    for (const [token, tfValue] of tf.entries()) {
      const idfValue = this.idf.get(token) || Math.log(this.totalDocs)
      tfidf.set(token, tfValue * idfValue)
    }
    
    return tfidf
  }
  
  private getTFIDFVector(documentId: string): Map<string, number> {
    const tf = this.documentVectors.get(documentId)
    if (!tf) return new Map()
    
    const tfidf = new Map<string, number>()
    for (const [token, tfValue] of tf.entries()) {
      const idfValue = this.idf.get(token) || Math.log(this.totalDocs)
      tfidf.set(token, tfValue * idfValue)
    }
    
    return tfidf
  }
  
  private cosineSimilarity(
    vec1: Map<string, number>,
    vec2: Map<string, number>
  ): number {
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    // Calculate dot product and norm for vec1
    for (const [token, value1] of vec1.entries()) {
      const value2 = vec2.get(token) || 0
      dotProduct += value1 * value2
      norm1 += value1 * value1
    }
    
    // Calculate norm for vec2
    for (const value of vec2.values()) {
      norm2 += value * value
    }
    
    if (norm1 === 0 || norm2 === 0) return 0
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }
}