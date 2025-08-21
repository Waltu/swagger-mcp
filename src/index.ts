#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { SwaggerAnalyzer } from "./swagger-analyzer.js"
import { SwaggerFetcher } from "./swagger-fetcher.js"
import { SemanticSearch } from "./semantic-search.js"
import type { SwaggerService } from "./types.js"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

const loadServices = (): SwaggerService[] => {
  try {
    const swaggersPath = join(__dirname, "..", "swaggers.json")
    const content = readFileSync(swaggersPath, "utf-8")
    return JSON.parse(content) as SwaggerService[]
  } catch (error) {
    console.error("Failed to load swaggers.json:", error)
    return []
  }
}

const services = loadServices()
const fetcher = new SwaggerFetcher(services)
const semanticSearch = new SemanticSearch()

// Track indexing state
let indexingInProgress = false
let indexingComplete = false
let indexingProgress = { current: 0, total: services.length }

// Index all swagger documents in background without blocking
async function indexAllServices() {
  indexingInProgress = true
  console.error("Starting background indexing of swagger documents...")
  
  // Use setTimeout to ensure this doesn't block the main thread
  setTimeout(async () => {
    for (let i = 0; i < services.length; i++) {
      const service = services[i]
      indexingProgress.current = i + 1
      
      try {
        const swagger = await fetcher.fetchSwagger(service.slug)
        if (swagger) {
          await semanticSearch.indexSwagger(swagger, service)
        }
      } catch (error) {
        console.error(`Failed to index ${service.slug}:`, error)
      }
      
      // Add small delay between fetches to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const stats = semanticSearch.getStats()
    console.error(`✓ Indexing complete: ${stats.totalDocuments} documents from ${stats.services.length} services`)
    indexingInProgress = false
    indexingComplete = true
  }, 1000) // Start after 1 second delay
}

// Start indexing in background - don't await it
indexAllServices().catch(error => {
  console.error("Indexing failed:", error)
  indexingInProgress = false
})

const server = new Server(
  {
    name: "swagger-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
)

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: services.map((service) => ({
      uri: `swagger://${service.slug}`,
      name: service.name,
      description: `OpenAPI documentation for ${service.name} (${service.group})`,
      mimeType: "application/json",
    })),
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri
  if (!uri.startsWith("swagger://")) {
    throw new Error("Invalid resource URI")
  }

  const slug = uri.replace("swagger://", "")
  const swagger = await fetcher.fetchSwagger(slug)

  if (!swagger) {
    throw new Error(`Failed to fetch swagger for ${slug}`)
  }

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(swagger, null, 2),
      },
    ],
  }
})

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_services",
        description: "List all available microservices",
        inputSchema: {
          type: "object",
          properties: {
            group: {
              type: "string",
              description: "Filter services by group (optional)",
            },
          },
        },
      },
      {
        name: "search_services",
        description: "Search for microservices by name, slug, or group",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_swagger",
        description: "Get the full OpenAPI/Swagger documentation for a service",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Service slug identifier",
            },
          },
          required: ["slug"],
        },
      },
      {
        name: "get_endpoints",
        description: "Get all endpoints from a service's API",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Service slug identifier",
            },
          },
          required: ["slug"],
        },
      },
      {
        name: "search_endpoints",
        description: "Search for specific endpoints in a service",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Service slug identifier",
            },
            query: {
              type: "string",
              description: "Search query for endpoints",
            },
          },
          required: ["slug", "query"],
        },
      },
      {
        name: "get_endpoint_details",
        description: "Get detailed information about a specific endpoint",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Service slug identifier",
            },
            path: {
              type: "string",
              description: "API endpoint path",
            },
            method: {
              type: "string",
              description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
              enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
            },
          },
          required: ["slug", "path", "method"],
        },
      },
      {
        name: "get_schemas",
        description: "Get all data schemas/models from a service",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Service slug identifier",
            },
          },
          required: ["slug"],
        },
      },
      {
        name: "semantic_search",
        description: "Search across all API documentation using natural language queries",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Natural language search query (e.g., 'find payment processing endpoints', 'user authentication APIs')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "find_similar",
        description: "Find endpoints similar to a given endpoint",
        inputSchema: {
          type: "object",
          properties: {
            service: {
              type: "string",
              description: "Service slug",
            },
            path: {
              type: "string",
              description: "Endpoint path",
            },
            method: {
              type: "string",
              description: "HTTP method",
            },
            limit: {
              type: "number",
              description: "Maximum number of similar endpoints (default: 5)",
              default: 5,
            },
          },
          required: ["service", "path", "method"],
        },
      },
      {
        name: "search_stats",
        description: "Get statistics about indexed swagger documentation",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "indexing_status",
        description: "Check the status of background indexing",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "compare_services",
        description: "Compare endpoints between two services",
        inputSchema: {
          type: "object",
          properties: {
            slug1: {
              type: "string",
              description: "First service slug",
            },
            slug2: {
              type: "string",
              description: "Second service slug",
            },
          },
          required: ["slug1", "slug2"],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case "list_services": {
        const group = args?.group as string | undefined
        const serviceList = group ? fetcher.getServicesByGroup(group) : fetcher.getServices()
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(serviceList, null, 2),
            },
          ],
        }
      }

      case "search_services": {
        const query = args?.query as string
        const results = fetcher.searchServices(query)
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        }
      }

      case "get_swagger": {
        const slug = args?.slug as string
        const swagger = await fetcher.fetchSwagger(slug)
        return {
          content: [
            {
              type: "text",
              text: swagger ? JSON.stringify(swagger, null, 2) : "Failed to fetch swagger",
            },
          ],
        }
      }

      case "get_endpoints": {
        const slug = args?.slug as string
        const swagger = await fetcher.fetchSwagger(slug)
        if (!swagger) {
          throw new Error(`Failed to fetch swagger for ${slug}`)
        }
        const endpoints = SwaggerAnalyzer.extractEndpoints(swagger)
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(endpoints, null, 2),
            },
          ],
        }
      }

      case "search_endpoints": {
        const slug = args?.slug as string
        const query = args?.query as string
        const swagger = await fetcher.fetchSwagger(slug)
        if (!swagger) {
          throw new Error(`Failed to fetch swagger for ${slug}`)
        }
        const endpoints = SwaggerAnalyzer.searchEndpoints(swagger, query)
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(endpoints, null, 2),
            },
          ],
        }
      }

      case "get_endpoint_details": {
        const slug = args?.slug as string
        const path = args?.path as string
        const method = args?.method as string
        const swagger = await fetcher.fetchSwagger(slug)
        if (!swagger) {
          throw new Error(`Failed to fetch swagger for ${slug}`)
        }
        const details = SwaggerAnalyzer.getEndpointDetails(swagger, path, method)
        return {
          content: [
            {
              type: "text",
              text: details ? JSON.stringify(details, null, 2) : "Endpoint not found",
            },
          ],
        }
      }

      case "get_schemas": {
        const slug = args?.slug as string
        const swagger = await fetcher.fetchSwagger(slug)
        if (!swagger) {
          throw new Error(`Failed to fetch swagger for ${slug}`)
        }
        const schemas = SwaggerAnalyzer.extractSchemas(swagger)
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schemas, null, 2),
            },
          ],
        }
      }

      case "semantic_search": {
        const query = args?.query as string
        const limit = (args?.limit as number) || 10
        
        // Check if indexing is still in progress
        if (!indexingComplete && indexingInProgress) {
          const progress = `${indexingProgress.current}/${indexingProgress.total}`
          return {
            content: [
              {
                type: "text",
                text: `⏳ Indexing in progress (${progress}). Results may be incomplete.\n\nPartial results:\n${JSON.stringify(semanticSearch.search(query, limit).map(doc => ({
                  service: doc.metadata.service,
                  path: doc.metadata.path,
                  method: doc.metadata.method,
                })), null, 2)}`,
              },
            ],
          }
        }
        
        const results = semanticSearch.search(query, limit)
        
        const formatted = results.map(doc => ({
          service: doc.metadata.service,
          type: doc.metadata.type,
          path: doc.metadata.path,
          method: doc.metadata.method,
          operationId: doc.metadata.operationId,
          preview: doc.content.substring(0, 200)
        }))
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        }
      }
      
      case "find_similar": {
        const service = args?.service as string
        const path = args?.path as string
        const method = args?.method as string
        const limit = (args?.limit as number) || 5
        
        const docId = `${service}-${method.toUpperCase()}-${path}`
        const similar = semanticSearch.findSimilar(docId, limit)
        
        const formatted = similar.map(doc => ({
          service: doc.metadata.service,
          type: doc.metadata.type,
          path: doc.metadata.path,
          method: doc.metadata.method,
          operationId: doc.metadata.operationId,
          preview: doc.content.substring(0, 200)
        }))
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        }
      }
      
      case "search_stats": {
        const stats = semanticSearch.getStats()
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...stats,
                indexingStatus: indexingComplete ? "complete" : indexingInProgress ? "in_progress" : "pending",
                indexingProgress: indexingProgress
              }, null, 2),
            },
          ],
        }
      }
      
      case "indexing_status": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: indexingComplete ? "complete" : indexingInProgress ? "in_progress" : "pending",
                progress: indexingProgress,
                stats: semanticSearch.getStats()
              }, null, 2),
            },
          ],
        }
      }

      case "compare_services": {
        const slug1 = args?.slug1 as string
        const slug2 = args?.slug2 as string
        const [swagger1, swagger2] = await Promise.all([
          fetcher.fetchSwagger(slug1),
          fetcher.fetchSwagger(slug2),
        ])

        if (!swagger1 || !swagger2) {
          throw new Error("Failed to fetch one or both swagger documents")
        }

        const endpoints1 = SwaggerAnalyzer.extractEndpoints(swagger1)
        const endpoints2 = SwaggerAnalyzer.extractEndpoints(swagger2)

        const comparison = {
          service1: {
            slug: slug1,
            endpointCount: endpoints1.length,
            endpoints: endpoints1.map((e) => `${e.method} ${e.path}`),
          },
          service2: {
            slug: slug2,
            endpointCount: endpoints2.length,
            endpoints: endpoints2.map((e) => `${e.method} ${e.path}`),
          },
          onlyInService1: endpoints1
            .filter(
              (e1) => !endpoints2.some((e2) => e2.method === e1.method && e2.path === e1.path),
            )
            .map((e) => `${e.method} ${e.path}`),
          onlyInService2: endpoints2
            .filter(
              (e2) => !endpoints1.some((e1) => e1.method === e2.method && e1.path === e2.path),
            )
            .map((e) => `${e.method} ${e.path}`),
          common: endpoints1
            .filter((e1) => endpoints2.some((e2) => e2.method === e1.method && e2.path === e1.path))
            .map((e) => `${e.method} ${e.path}`),
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(comparison, null, 2),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("✓ Swagger MCP server running on stdio")
  console.error("→ Background indexing will start in 1 second...")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
