import type { SwaggerDocument, SwaggerOperation } from "./types.js"

export interface VectorDocument {
  id: string
  content: string
  metadata: {
    service: string
    path?: string
    method?: string
    operationId?: string
    type: "endpoint" | "schema" | "description"
  }
  embedding?: number[]
}

export class SwaggerVectorizer {
  /**
   * Convert swagger docs into searchable documents
   */
  static extractDocuments(
    swagger: SwaggerDocument,
    serviceName: string
  ): VectorDocument[] {
    const documents: VectorDocument[] = []
    
    // Extract endpoint documentation
    if (swagger.paths) {
      for (const [path, pathItem] of Object.entries(swagger.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (this.isHttpMethod(method)) {
            const op = operation as SwaggerOperation
            
            // Create document for each endpoint
            const content = this.buildEndpointContent(path, method, op)
            documents.push({
              id: `${serviceName}-${method}-${path}`,
              content,
              metadata: {
                service: serviceName,
                path,
                method: method.toUpperCase(),
                operationId: op.operationId,
                type: "endpoint"
              }
            })
          }
        }
      }
    }
    
    // Extract schema documentation
    const schemas = swagger.components?.schemas || swagger.definitions
    if (schemas) {
      for (const [name, schema] of Object.entries(schemas)) {
        const content = this.buildSchemaContent(name, schema)
        documents.push({
          id: `${serviceName}-schema-${name}`,
          content,
          metadata: {
            service: serviceName,
            type: "schema"
          }
        })
      }
    }
    
    return documents
  }
  
  private static buildEndpointContent(
    path: string,
    method: string,
    operation: SwaggerOperation
  ): string {
    const parts = [
      `${method.toUpperCase()} ${path}`,
      operation.summary || "",
      operation.description || "",
      operation.tags?.join(" ") || "",
      `operationId: ${operation.operationId || ""}`,
    ]
    
    // Add parameter descriptions
    if (operation.parameters) {
      parts.push("Parameters: " + JSON.stringify(operation.parameters))
    }
    
    // Add response descriptions
    if (operation.responses) {
      parts.push("Responses: " + Object.keys(operation.responses).join(", "))
    }
    
    return parts.filter(Boolean).join(" | ")
  }
  
  private static buildSchemaContent(name: string, schema: any): string {
    const parts = [
      `Schema: ${name}`,
      schema.description || "",
      `Type: ${schema.type || "object"}`,
    ]
    
    if (schema.properties) {
      parts.push(`Properties: ${Object.keys(schema.properties).join(", ")}`)
    }
    
    return parts.filter(Boolean).join(" | ")
  }
  
  private static isHttpMethod(method: string): boolean {
    return ["get", "post", "put", "delete", "patch", "options", "head"].includes(
      method.toLowerCase()
    )
  }
}