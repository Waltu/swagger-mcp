export interface SwaggerService {
  name: string
  slug: string
  baseUrl: string
  openApiPath: string
  group: string
}

export interface SwaggerOperation {
  summary?: string
  description?: string
  operationId?: string
  tags?: string[]
  parameters?: unknown[]
  requestBody?: unknown
  responses?: Record<string, unknown>
  [key: string]: unknown
}

export interface SwaggerPath {
  get?: SwaggerOperation
  post?: SwaggerOperation
  put?: SwaggerOperation
  delete?: SwaggerOperation
  patch?: SwaggerOperation
  options?: SwaggerOperation
  head?: SwaggerOperation
  [key: string]: SwaggerOperation | undefined
}

export interface SwaggerComponents {
  schemas?: Record<string, unknown>
  [key: string]: unknown
}

export interface SwaggerDocument {
  openapi?: string
  swagger?: string
  info?: {
    title?: string
    description?: string
    version?: string
  }
  paths?: Record<string, SwaggerPath>
  components?: SwaggerComponents
  definitions?: Record<string, unknown>
  servers?: Array<{ url: string; description?: string }>
  host?: string
  basePath?: string
  schemes?: string[]
}

export interface CachedSwagger {
  document: SwaggerDocument
  timestamp: number
  service: SwaggerService
}
