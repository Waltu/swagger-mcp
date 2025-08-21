# Vectorizing Swagger Documentation - Implementation Guide

## 1. Choose Embedding Model

### Option A: OpenAI Embeddings (Cloud)
```typescript
npm install openai

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: documentContent,
})
```
**Pros:** High quality, easy setup
**Cons:** Requires API key, costs money, network latency

### Option B: Local Embeddings (Transformers.js)
```typescript
npm install @xenova/transformers

import { pipeline } from '@xenova/transformers'
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
const embedding = await embedder(documentContent)
```
**Pros:** Free, private, no network calls
**Cons:** Larger package size, slower on CPU

### Option C: Ollama (Local LLM)
```typescript
npm install ollama

import { Ollama } from 'ollama'
const ollama = new Ollama()
const response = await ollama.embeddings({
  model: 'nomic-embed-text',
  prompt: documentContent
})
```
**Pros:** Runs locally, good quality
**Cons:** Requires Ollama installation

## 2. Choose Vector Database

### Option A: Chroma (Recommended for MCP)
```typescript
npm install chromadb

import { ChromaClient } from 'chromadb'

const client = new ChromaClient()
const collection = await client.createCollection({
  name: "swagger_docs",
  metadata: { "hnsw:space": "cosine" }
})

await collection.add({
  ids: documents.map(d => d.id),
  embeddings: embeddings,
  metadatas: documents.map(d => d.metadata),
  documents: documents.map(d => d.content)
})
```

### Option B: Pinecone (Cloud)
```typescript
npm install @pinecone-database/pinecone

import { Pinecone } from '@pinecone-database/pinecone'
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
```

### Option C: SQLite with Vector Extension (Lightweight)
```typescript
npm install better-sqlite3 sqlite-vec

import Database from 'better-sqlite3'
const db = new Database('swagger.db')
db.loadExtension('vec0')

db.exec(`
  CREATE VIRTUAL TABLE swagger_embeddings USING vec0(
    id TEXT PRIMARY KEY,
    embedding FLOAT[384]
  )
`)
```

## 3. Implementation Example

```typescript
// package.json additions
{
  "dependencies": {
    "@xenova/transformers": "^2.17.0",
    "chromadb": "^1.8.1",
    "hnswlib-node": "^3.0.0"  // Alternative: pure JS vector search
  }
}
```

## 4. Enhanced MCP Tools

```typescript
// New semantic search tools
{
  name: "semantic_search",
  description: "Search across all API documentation using natural language",
  inputSchema: {
    query: "Find all endpoints that handle payment processing",
    limit: 10,
    threshold: 0.7  // Similarity threshold
  }
}

{
  name: "find_similar_endpoints",
  description: "Find endpoints similar to a given endpoint",
  inputSchema: {
    service: "payment-service",
    path: "/payments",
    method: "POST"
  }
}

{
  name: "explain_api_flow",
  description: "Understand how different services interact",
  inputSchema: {
    query: "How does user authentication flow through the system?"
  }
}
```

## 5. Simple In-Memory Implementation (No Dependencies)

```typescript
// Simplest approach using TF-IDF for text similarity
class SimpleVectorStore {
  private documents: Map<string, VectorDocument> = new Map()
  private tfidf: Map<string, Map<string, number>> = new Map()
  
  addDocument(doc: VectorDocument) {
    // Tokenize and create TF-IDF vectors
    const tokens = this.tokenize(doc.content)
    const tfidfVector = this.calculateTFIDF(tokens)
    this.tfidf.set(doc.id, tfidfVector)
    this.documents.set(doc.id, doc)
  }
  
  search(query: string, limit = 10): VectorDocument[] {
    const queryTokens = this.tokenize(query)
    const queryVector = this.calculateTFIDF(queryTokens)
    
    // Calculate cosine similarity
    const scores = Array.from(this.documents.entries()).map(([id, doc]) => ({
      doc,
      score: this.cosineSimilarity(queryVector, this.tfidf.get(id)!)
    }))
    
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.doc)
  }
  
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
  }
  
  private calculateTFIDF(tokens: string[]): Map<string, number> {
    // Simplified TF-IDF calculation
    const tf = new Map<string, number>()
    tokens.forEach(token => {
      tf.set(token, (tf.get(token) || 0) + 1)
    })
    return tf
  }
  
  private cosineSimilarity(
    vec1: Map<string, number>,
    vec2: Map<string, number>
  ): number {
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    const allKeys = new Set([...vec1.keys(), ...vec2.keys()])
    
    for (const key of allKeys) {
      const val1 = vec1.get(key) || 0
      const val2 = vec2.get(key) || 0
      dotProduct += val1 * val2
      norm1 += val1 * val1
      norm2 += val2 * val2
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }
}
```

## 6. Benefits of Vectorization

1. **Natural Language Queries**
   - "Find all endpoints that create new resources"
   - "Which services handle user data?"
   - "Show me all payment-related APIs"

2. **Better Discovery**
   - Find conceptually similar endpoints
   - Discover relationships between services
   - Identify duplicate functionality

3. **Improved Documentation**
   - Auto-generate API summaries
   - Create service dependency graphs
   - Suggest missing documentation

4. **Smart Suggestions**
   - "You might also need these endpoints..."
   - "Similar patterns exist in service X"
   - "This schema is similar to..."

## 7. Quick Start Implementation

For fastest implementation with minimal dependencies:

```bash
npm install @xenova/transformers hnswlib-node
```

Then update the MCP server to:
1. Load and vectorize all swagger docs on startup
2. Build an in-memory HNSW index
3. Add semantic search tool
4. Cache embeddings to disk for faster restarts

This would add ~50MB to your package but provide powerful semantic search capabilities!