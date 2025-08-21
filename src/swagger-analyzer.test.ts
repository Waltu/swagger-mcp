import { describe, expect, it } from "vitest";
import { SwaggerAnalyzer } from "./swagger-analyzer.js";
import type { SwaggerDocument } from "./types.js";

describe("SwaggerAnalyzer", () => {
  const mockSwaggerDoc: SwaggerDocument = {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
      description: "Test API Description",
    },
    servers: [{ url: "https://api.example.com" }],
    paths: {
      "/users": {
        get: {
          summary: "Get all users",
          operationId: "getUsers",
          tags: ["users"],
        },
        post: {
          summary: "Create a user",
          operationId: "createUser",
          tags: ["users"],
        },
      },
      "/users/{id}": {
        get: {
          summary: "Get user by ID",
          operationId: "getUserById",
          tags: ["users"],
        },
        delete: {
          summary: "Delete user",
          operationId: "deleteUser",
          tags: ["users", "admin"],
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    },
  };

  const mockSwagger2Doc: SwaggerDocument = {
    swagger: "2.0",
    info: {
      title: "Legacy API",
      version: "1.0.0",
    },
    host: "legacy.example.com",
    basePath: "/api/v1",
    schemes: ["https"],
    paths: {
      "/items": {
        get: {
          summary: "Get items",
          operationId: "getItems",
        },
      },
    },
    definitions: {
      Item: {
        type: "object",
        properties: {
          id: { type: "number" },
        },
      },
    },
  };

  describe("extractEndpoints", () => {
    it("should extract all endpoints from OpenAPI 3.0 document", () => {
      const endpoints = SwaggerAnalyzer.extractEndpoints(mockSwaggerDoc);
      expect(endpoints).toHaveLength(4);
      expect(endpoints[0]).toEqual({
        path: "/users",
        method: "GET",
        summary: "Get all users",
        operationId: "getUsers",
        tags: ["users"],
      });
    });

    it("should return empty array for document without paths", () => {
      const doc: SwaggerDocument = { openapi: "3.0.0" };
      const endpoints = SwaggerAnalyzer.extractEndpoints(doc);
      expect(endpoints).toEqual([]);
    });
  });

  describe("findEndpointByOperationId", () => {
    it("should find endpoint by operation ID", () => {
      const result = SwaggerAnalyzer.findEndpointByOperationId(
        mockSwaggerDoc,
        "deleteUser",
      );
      expect(result).not.toBeNull();
      expect(result?.path).toBe("/users/{id}");
      expect(result?.method).toBe("delete");
    });

    it("should return null for non-existent operation ID", () => {
      const result = SwaggerAnalyzer.findEndpointByOperationId(
        mockSwaggerDoc,
        "nonExistent",
      );
      expect(result).toBeNull();
    });
  });

  describe("extractSchemas", () => {
    it("should extract schemas from OpenAPI 3.0 document", () => {
      const schemas = SwaggerAnalyzer.extractSchemas(mockSwaggerDoc);
      expect(schemas).toHaveProperty("User");
      expect(schemas.User.properties).toHaveProperty("id");
    });

    it("should extract definitions from Swagger 2.0 document", () => {
      const schemas = SwaggerAnalyzer.extractSchemas(mockSwagger2Doc);
      expect(schemas).toHaveProperty("Item");
    });

    it("should return empty object for document without schemas", () => {
      const doc: SwaggerDocument = { openapi: "3.0.0" };
      const schemas = SwaggerAnalyzer.extractSchemas(doc);
      expect(schemas).toEqual({});
    });
  });

  describe("getBaseUrl", () => {
    it("should get base URL from OpenAPI 3.0 servers", () => {
      const url = SwaggerAnalyzer.getBaseUrl(mockSwaggerDoc);
      expect(url).toBe("https://api.example.com");
    });

    it("should construct base URL from Swagger 2.0 host and schemes", () => {
      const url = SwaggerAnalyzer.getBaseUrl(mockSwagger2Doc);
      expect(url).toBe("https://legacy.example.com/api/v1");
    });

    it("should return empty string for document without base URL info", () => {
      const doc: SwaggerDocument = { openapi: "3.0.0" };
      const url = SwaggerAnalyzer.getBaseUrl(doc);
      expect(url).toBe("");
    });
  });

  describe("searchEndpoints", () => {
    it("should search endpoints by path", () => {
      const results = SwaggerAnalyzer.searchEndpoints(mockSwaggerDoc, "users");
      expect(results).toHaveLength(4);
    });

    it("should search endpoints by operation ID", () => {
      const results = SwaggerAnalyzer.searchEndpoints(
        mockSwaggerDoc,
        "deleteUser",
      );
      expect(results).toHaveLength(1);
      expect(results[0].operationId).toBe("deleteUser");
    });

    it("should search endpoints by summary", () => {
      const results = SwaggerAnalyzer.searchEndpoints(mockSwaggerDoc, "Delete");
      expect(results).toHaveLength(1);
    });

    it("should search endpoints by tags", () => {
      const results = SwaggerAnalyzer.searchEndpoints(mockSwaggerDoc, "admin");
      expect(results).toHaveLength(1);
    });

    it("should be case insensitive", () => {
      const results = SwaggerAnalyzer.searchEndpoints(mockSwaggerDoc, "DELETE");
      expect(results).toHaveLength(1);
    });
  });

  describe("getEndpointDetails", () => {
    it("should get endpoint details", () => {
      const details = SwaggerAnalyzer.getEndpointDetails(
        mockSwaggerDoc,
        "/users",
        "GET",
      );
      expect(details).not.toBeNull();
      expect(details.summary).toBe("Get all users");
      expect(details.operationId).toBe("getUsers");
    });

    it("should handle lowercase method", () => {
      const details = SwaggerAnalyzer.getEndpointDetails(
        mockSwaggerDoc,
        "/users",
        "get",
      );
      expect(details).not.toBeNull();
    });

    it("should return null for non-existent endpoint", () => {
      const details = SwaggerAnalyzer.getEndpointDetails(
        mockSwaggerDoc,
        "/nonexistent",
        "GET",
      );
      expect(details).toBeNull();
    });
  });
});
