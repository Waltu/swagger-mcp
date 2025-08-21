# Swagger MCP Server

An MCP (Model Context Protocol) server that provides AI tools access to multiple Swagger/OpenAPI documentation endpoints. This allows AI assistants to browse, search, and understand API specifications across your microservices architecture.

## Features

- **Service Discovery**: List and search available microservices
- **Swagger Fetching**: Retrieve full OpenAPI/Swagger documentation
- **Endpoint Analysis**: Extract and search API endpoints
- **Schema Extraction**: Get data models and schemas
- **Service Comparison**: Compare endpoints between services
- **Caching**: Built-in caching mechanism for performance
- **Group Filtering**: Organize services by groups

## Installation

```bash
npm install
npm run build
```

## Quick Start

1. Clone and build the project:
```bash
git clone <repository-url>
cd swagger-mcp
npm install
npm run build
```

2. Generate an example MCP configuration:
```bash
node generate-example-config.js
```

This will create an `example.mcp.json` file with the correct paths to your swagger-mcp installation.

3. Copy the generated configuration to LLM MCP configuration

4. Add your Swagger endpoints to `swagger-config.json`:
```json
[
  {
    "name": "Service Name",
    "slug": "service-slug",
    "baseUrl": "http://service.example.com",
    "openApiPath": "/documentation/json",
    "group": "Service Group"
  }
]
```

5. Restart Agent to load the MCP server.

## Configuration

The server reads service configurations from `swagger-config.json` file. Each service should have:

```json
{
  "name": "Service Name",
  "slug": "service-slug",
  "baseUrl": "http://service.example.com",
  "openApiPath": "/documentation/json",
  "group": "Service Group"
}
```

## Usage

### Adding to Claude Code

The `generate-example-config.js` script creates an MCP configuration with the correct absolute paths. The generated configuration will look like:

```json
{
  "mcpServers": {
    "swagger": {
      "command": "node",
      "args": ["/absolute/path/to/swagger-mcp/dist/index.js"]
    }
  }
}
```

After adding the configuration, restart Agent for the changes to take effect.

### Available Tools

The MCP server provides the following tools:

1. **list_services** - List all available microservices
   - Optional: Filter by group

2. **search_services** - Search for services by name, slug, or group
   - Required: query string

3. **get_swagger** - Get full OpenAPI/Swagger documentation
   - Required: service slug

4. **get_endpoints** - List all endpoints from a service
   - Required: service slug

5. **search_endpoints** - Search for specific endpoints
   - Required: service slug and query

6. **get_endpoint_details** - Get detailed endpoint information
   - Required: service slug, path, and HTTP method

7. **get_schemas** - Extract data schemas/models
   - Required: service slug

8. **compare_services** - Compare endpoints between two services
   - Required: two service slugs

### Available Resources

Each service is exposed as a resource with URI format: `swagger://{service-slug}`

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint and format code
npm run lint

# Check linting without fixing
npm run lint:check
```

## Architecture

The server is built with:
- **TypeScript** for type safety
- **@modelcontextprotocol/sdk** for MCP server implementation
- **Biome** for linting and formatting
- **Vitest** for testing
- **node-fetch** for HTTP requests

### Main Components

- `index.ts` - MCP server implementation and tool handlers
- `swagger-fetcher.ts` - Service for fetching and caching Swagger documents
- `swagger-analyzer.ts` - Utilities for analyzing Swagger documents
- `types.ts` - TypeScript type definitions

## Testing

Tests are written using Vitest and cover:
- Service discovery and filtering
- Swagger document fetching and caching
- Endpoint extraction and searching
- Schema extraction
- Base URL resolution

Run tests with:
```bash
npm test
```

## License

MIT
