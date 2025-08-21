import type { SwaggerDocument, SwaggerOperation } from "./types.js"

export class CodeGenerator {
  static generateTypeScriptInterface(schema: any, name: string): string {
    if (!schema || typeof schema !== "object") return ""
    
    let result = `export interface ${name} {\n`
    
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
        const required = schema.required?.includes(key) ? "" : "?"
        const type = this.mapSwaggerTypeToTS(prop)
        result += `  ${key}${required}: ${type}\n`
      }
    }
    
    result += "}\n"
    return result
  }

  static mapSwaggerTypeToTS(prop: any): string {
    if (!prop.type) return "unknown"
    
    switch (prop.type) {
      case "string": return "string"
      case "number": return "number"
      case "integer": return "number"
      case "boolean": return "boolean"
      case "array": 
        return `Array<${this.mapSwaggerTypeToTS(prop.items || {})}>`
      case "object":
        return "Record<string, unknown>"
      default: return "unknown"
    }
  }

  static generateCurlCommand(
    baseUrl: string,
    path: string,
    method: string,
    operation: SwaggerOperation
  ): string {
    const url = `${baseUrl}${path}`
    let curl = `curl -X ${method.toUpperCase()} "${url}"`
    
    // Add headers
    curl += ` \\\n  -H "Content-Type: application/json"`
    
    // Add auth header if needed
    if (operation.security) {
      curl += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`
    }
    
    // Add sample body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      curl += ` \\\n  -d '{"example": "data"}'`
    }
    
    return curl
  }

  static generateAPIClient(serviceName: string, endpoints: any[]): string {
    const className = serviceName.replace(/-/g, "").replace(/\b\w/g, l => l.toUpperCase())
    
    let code = `export class ${className}Client {\n`
    code += `  constructor(private baseUrl: string, private headers: HeadersInit = {}) {}\n\n`
    
    for (const endpoint of endpoints) {
      const methodName = endpoint.operationId || 
        `${endpoint.method.toLowerCase()}${endpoint.path.replace(/[^a-zA-Z]/g, "")}`
      
      code += `  async ${methodName}(): Promise<Response> {\n`
      code += `    return fetch(\`\${this.baseUrl}${endpoint.path}\`, {\n`
      code += `      method: "${endpoint.method}",\n`
      code += `      headers: this.headers,\n`
      code += `    })\n`
      code += `  }\n\n`
    }
    
    code += "}\n"
    return code
  }
}