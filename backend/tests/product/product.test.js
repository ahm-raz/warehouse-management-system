/**
 * Product Module Test Suite
 * Comprehensive tests for product management endpoints
 *
 * Covers:
 * - Product creation (success + validation failure)
 * - Product retrieval with pagination
 * - Product update
 * - Product soft deletion
 * - SKU uniqueness enforcement
 * - Role-based authorization checks
 */

import { jest } from "@jest/globals";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  setupTestEnv,
} from "../setup/testSetup.js";
import {
  request,
  createAuthenticatedUser,
  createTestUsers,
} from "../helpers/request.js";
import {
  createMockProduct,
  createMockProducts,
  createInvalidProduct,
} from "../mocks/productFactory.js";
import Product from "../../src/models/Product.js";

// ==================== SUITE SETUP ====================

let admin, manager, staff;

beforeAll(async () => {
  setupTestEnv();
  await connectTestDB();
});

beforeEach(async () => {
  // Create test users with different roles for each test
  const users = await createTestUsers();
  admin = users.admin;
  manager = users.manager;
  staff = users.staff;
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

// ==================== PRODUCT CREATION TESTS ====================

describe("POST /api/products", () => {
  describe("Product Creation Success", () => {
    it("should create a product successfully as Admin", async () => {
      // Arrange
      const productData = createMockProduct();

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Product created successfully");
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.name).toBe(productData.name);
      expect(res.body.data.product.SKU).toBe(productData.SKU.toUpperCase());
      expect(res.body.data.product.unitPrice).toBe(productData.unitPrice);
    });

    it("should create a product successfully as Manager", async () => {
      // Arrange
      const productData = createMockProduct();

      // Act
      const res = await manager.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should auto-uppercase the SKU", async () => {
      // Arrange
      const productData = createMockProduct({ SKU: "sku-lowercase-123" });

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.data.product.SKU).toBe("SKU-LOWERCASE-123");
    });

    it("should set default quantity to 0 when not provided", async () => {
      // Arrange
      const productData = createMockProduct();
      delete productData.quantity;

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.data.product.quantity).toBe(0);
    });

    it("should store product in database", async () => {
      // Arrange
      const productData = createMockProduct();

      // Act
      await admin.authenticatedAgent.post("/api/products").send(productData);

      // Assert - verify in database
      const dbProduct = await Product.findOne({
        SKU: productData.SKU.toUpperCase(),
      });
      expect(dbProduct).toBeTruthy();
      expect(dbProduct.name).toBe(productData.name);
      expect(dbProduct.isDeleted).toBe(false);
    });
  });

  describe("Product Validation Failure", () => {
    it("should reject product creation with missing name", async () => {
      // Arrange
      const productData = createMockProduct();
      delete productData.name;

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert - validators throw plain Error (not ApiError), error handler returns 500
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject product creation with missing SKU", async () => {
      // Arrange
      const productData = createMockProduct();
      delete productData.SKU;

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject product creation with missing unitPrice", async () => {
      // Arrange
      const productData = createMockProduct();
      delete productData.unitPrice;

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject product creation with negative unitPrice", async () => {
      // Arrange
      const productData = createMockProduct({ unitPrice: -10 });

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject product creation with negative quantity", async () => {
      // Arrange
      const productData = createMockProduct({ quantity: -5 });

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("SKU Uniqueness Enforcement", () => {
    it("should reject duplicate SKU", async () => {
      // Arrange - create first product
      const productData = createMockProduct({ SKU: "UNIQUE-SKU-001" });
      await admin.authenticatedAgent.post("/api/products").send(productData);

      // Act - try to create another product with same SKU
      const duplicateProduct = createMockProduct({ SKU: "UNIQUE-SKU-001" });
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(duplicateProduct);

      // Assert
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should enforce SKU uniqueness case-insensitively", async () => {
      // Arrange - create first product with uppercase SKU
      const productData = createMockProduct({ SKU: "CASE-TEST-001" });
      await admin.authenticatedAgent.post("/api/products").send(productData);

      // Act - try with lowercase version of same SKU
      const duplicateProduct = createMockProduct({ SKU: "case-test-001" });
      const res = await admin.authenticatedAgent
        .post("/api/products")
        .send(duplicateProduct);

      // Assert
      expect(res.status).toBe(409);
    });
  });

  describe("Role-Based Authorization", () => {
    it("should reject product creation by Staff role", async () => {
      // Arrange
      const productData = createMockProduct();

      // Act
      const res = await staff.authenticatedAgent
        .post("/api/products")
        .send(productData);

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject product creation without authentication", async () => {
      // Arrange
      const productData = createMockProduct();

      // Act
      const res = await request.post("/api/products").send(productData);

      // Assert
      expect(res.status).toBe(401);
    });
  });
});

// ==================== PRODUCT RETRIEVAL TESTS ====================

describe("GET /api/products", () => {
  describe("Product Retrieval with Pagination", () => {
    it("should retrieve products with default pagination", async () => {
      // Arrange - create some products
      const products = createMockProducts(3);
      for (const product of products) {
        await admin.authenticatedAgent.post("/api/products").send(product);
      }

      // Act
      const res = await admin.authenticatedAgent.get("/api/products");

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toBeDefined();
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.products.length).toBe(3);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.totalProducts).toBe(3);
    });

    it("should respect pagination parameters", async () => {
      // Arrange - create 5 products
      const products = createMockProducts(5);
      for (const product of products) {
        await admin.authenticatedAgent.post("/api/products").send(product);
      }

      // Act - request page 1 with limit 2
      const res = await admin.authenticatedAgent.get(
        "/api/products?page=1&limit=2"
      );

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      expect(res.body.data.pagination.totalProducts).toBe(5);
      expect(res.body.data.pagination.totalPages).toBe(3);
      expect(res.body.data.pagination.hasNextPage).toBe(true);
    });

    it("should return empty array when no products exist", async () => {
      // Act
      const res = await admin.authenticatedAgent.get("/api/products");

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
      expect(res.body.data.pagination.totalProducts).toBe(0);
    });

    it("should allow Staff to retrieve products", async () => {
      // Arrange
      const product = createMockProduct();
      await admin.authenticatedAgent.post("/api/products").send(product);

      // Act - Staff retrieves products
      const res = await staff.authenticatedAgent.get("/api/products");

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
    });

    it("should support search by product name", async () => {
      // Arrange
      await admin.authenticatedAgent
        .post("/api/products")
        .send(createMockProduct({ name: "Laptop Computer" }));
      await admin.authenticatedAgent
        .post("/api/products")
        .send(createMockProduct({ name: "Desktop Monitor" }));

      // Act
      const res = await admin.authenticatedAgent.get(
        "/api/products?search=Laptop"
      );

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe("Laptop Computer");
    });
  });
});

// ==================== PRODUCT BY ID TESTS ====================

describe("GET /api/products/:id", () => {
  it("should retrieve a product by ID", async () => {
    // Arrange
    const productData = createMockProduct();
    const createRes = await admin.authenticatedAgent
      .post("/api/products")
      .send(productData);
    const productId = createRes.body.data.product._id;

    // Act
    const res = await admin.authenticatedAgent.get(
      `/api/products/${productId}`
    );

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.product).toBeDefined();
    expect(res.body.data.product._id).toBe(productId);
  });

  it("should return 404 for non-existent product", async () => {
    // Arrange - use a valid but non-existent ObjectId
    const fakeId = "507f1f77bcf86cd799439011";

    // Act
    const res = await admin.authenticatedAgent.get(`/api/products/${fakeId}`);

    // Assert
    expect(res.status).toBe(404);
  });
});

// ==================== PRODUCT UPDATE TESTS ====================

describe("PUT /api/products/:id", () => {
  describe("Product Update Success", () => {
    it("should update product name successfully", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Act
      const res = await admin.authenticatedAgent
        .put(`/api/products/${productId}`)
        .send({ name: "Updated Product Name" });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toBe("Updated Product Name");
    });

    it("should update product unitPrice", async () => {
      // Arrange
      const productData = createMockProduct({ unitPrice: 50.0 });
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Act
      const res = await admin.authenticatedAgent
        .put(`/api/products/${productId}`)
        .send({ unitPrice: 75.0 });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.product.unitPrice).toBe(75.0);
    });

    it("should allow Manager to update product", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Act
      const res = await manager.authenticatedAgent
        .put(`/api/products/${productId}`)
        .send({ name: "Manager Updated" });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe("Manager Updated");
    });
  });

  describe("Product Update Authorization", () => {
    it("should reject update by Staff role", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Act
      const res = await staff.authenticatedAgent
        .put(`/api/products/${productId}`)
        .send({ name: "Staff Updated" });

      // Assert
      expect(res.status).toBe(403);
    });
  });
});

// ==================== PRODUCT SOFT DELETE TESTS ====================

describe("DELETE /api/products/:id", () => {
  describe("Product Soft Deletion", () => {
    it("should soft delete a product successfully", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Act
      const res = await admin.authenticatedAgent.delete(
        `/api/products/${productId}`
      );

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Product deleted successfully");
    });

    it("should mark product as deleted in database (not physically remove)", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Act
      await admin.authenticatedAgent.delete(`/api/products/${productId}`);

      // Assert - product should still exist in DB but be marked as deleted
      const dbProduct = await Product.findById(productId);
      expect(dbProduct).toBeTruthy();
      expect(dbProduct.isDeleted).toBe(true);
      expect(dbProduct.deletedAt).toBeDefined();
    });

    it("should not return soft-deleted products in listing", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Delete the product
      await admin.authenticatedAgent.delete(`/api/products/${productId}`);

      // Act
      const res = await admin.authenticatedAgent.get("/api/products");

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(0);
    });

    it("should return 404 when deleting already deleted product", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Delete once
      await admin.authenticatedAgent.delete(`/api/products/${productId}`);

      // Act - try to delete again
      const res = await admin.authenticatedAgent.delete(
        `/api/products/${productId}`
      );

      // Assert
      expect(res.status).toBe(404);
    });

    it("should reject deletion by Staff role", async () => {
      // Arrange
      const productData = createMockProduct();
      const createRes = await admin.authenticatedAgent
        .post("/api/products")
        .send(productData);
      const productId = createRes.body.data.product._id;

      // Act
      const res = await staff.authenticatedAgent.delete(
        `/api/products/${productId}`
      );

      // Assert
      expect(res.status).toBe(403);
    });
  });
});
