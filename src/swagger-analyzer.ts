import type { SwaggerDocument, SwaggerOperation } from "./types.js"

// Using static methods for simplicity and organization
// biome-ignore lint/complexity/noStaticOnlyClass: Static methods provide a clear namespace for swagger analysis functions
export class SwaggerAnalyzer {
  static extractEndpoints(doc: SwaggerDocument): Array<{
    path: string
    method: string
    summary?: string
    operationId?: string
    tags?: string[]
  }> {
    const endpoints: Array<{
      path: string
      method: string
      summary?: string
      operationId?: string
      tags?: string[]
    }> = []

    if (doc.paths) {
      for (const [path, pathItem] of Object.entries(doc.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (["get", "post", "put", "delete", "patch", "options", "head"].includes(method)) {
            const op = operation as SwaggerOperation
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: op.summary,
              operationId: op.operationId,
              tags: op.tags,
            })
          }
        }
      }
    }

    return endpoints
  }

  static findEndpointByOperationId(
    doc: SwaggerDocument,
    operationId: string,
  ): {
    path: string
    method: string
    operation: SwaggerOperation
  } | null {
    if (!doc.paths) return null

    for (const [path, pathItem] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        const op = operation as SwaggerOperation
        if (op.operationId === operationId) {
          return { path, method, operation: op }
        }
      }
    }

    return null
  }

  static extractSchemas(doc: SwaggerDocument): Record<string, unknown> {
    if (doc.openapi && doc.components?.schemas) {
      return doc.components.schemas
    }
    if (doc.swagger && doc.definitions) {
      return doc.definitions
    }
    return {}
  }

  static getBaseUrl(doc: SwaggerDocument): string {
    if (doc.servers?.[0]?.url) {
      return doc.servers[0].url
    }
    if (doc.host) {
      const scheme = doc.schemes?.[0] || "http"
      const basePath = doc.basePath || ""
      return `${scheme}://${doc.host}${basePath}`
    }
    return ""
  }

  static searchEndpoints(
    doc: SwaggerDocument,
    query: string,
  ): Array<{
    path: string
    method: string
    summary?: string
    operationId?: string
    tags?: string[]
  }> {
    const lowerQuery = query.toLowerCase()
    const endpoints = SwaggerAnalyzer.extractEndpoints(doc)

    return endpoints.filter(
      (endpoint) =>
        endpoint.path.toLowerCase().includes(lowerQuery) ||
        endpoint.operationId?.toLowerCase().includes(lowerQuery) ||
        endpoint.summary?.toLowerCase().includes(lowerQuery) ||
        endpoint.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    )
  }

  static getEndpointDetails(
    doc: SwaggerDocument,
    path: string,
    method: string,
  ): SwaggerOperation | null {
    const methodLower = method.toLowerCase()
    return (doc.paths?.[path]?.[methodLower] as SwaggerOperation | undefined) || null
  }
}
