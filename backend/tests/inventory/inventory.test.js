/**
 * Inventory Module Test Suite
 * Comprehensive tests for inventory management endpoints
 *
 * Covers:
 * - Stock adjustment increase (ADD)
 * - Stock adjustment decrease (REMOVE)
 * - Prevent negative stock
 * - Inventory log creation verification
 * - Low stock detection logic
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
import { createMockProduct, createLowStockProduct } from "../mocks/productFactory.js";
import {
  createAddStockAdjustment,
  createRemoveStockAdjustment,
  createInvalidStockAdjustment,
} from "../mocks/inventoryFactory.js";
import Product from "../../src/models/Product.js";
import InventoryLog from "../../src/models/InventoryLog.js";

// ==================== SUITE SETUP ====================

let admin, manager, staff;

beforeAll(async () => {
  setupTestEnv();
  await connectTestDB();
});

beforeEach(async () => {
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

// ==================== HELPER: Create a product via API ====================

const createTestProduct = async (overrides = {}) => {
  const productData = createMockProduct(overrides);
  const res = await admin.authenticatedAgent
    .post("/api/products")
    .send(productData);
  return res.body.data.product;
};

// ==================== STOCK ADJUSTMENT: ADD ====================

describe("PATCH /api/inventory/adjust (ADD)", () => {
  describe("Stock Adjustment Increase", () => {
    it("should increase stock successfully", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 50 });
      const adjustmentData = createAddStockAdjustment(product._id, {
        quantity: 25,
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.quantity).toBe(75); // 50 + 25
    });

    it("should record correct previous and new quantities", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 30 });
      const adjustmentData = createAddStockAdjustment(product._id, {
        quantity: 20,
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.body.data.inventoryLog).toBeDefined();
      expect(res.body.data.inventoryLog.previousQuantity).toBe(30);
      expect(res.body.data.inventoryLog.newQuantity).toBe(50);
      expect(res.body.data.inventoryLog.quantityChanged).toBe(20);
    });

    it("should allow Manager to adjust stock", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 40 });
      const adjustmentData = createAddStockAdjustment(product._id, {
        quantity: 10,
      });

      // Act
      const res = await manager.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.product.quantity).toBe(50);
    });

    it("should include note in inventory log", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 10 });
      const adjustmentData = createAddStockAdjustment(product._id, {
        quantity: 5,
        note: "Supplier delivery #12345",
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.body.data.inventoryLog.note).toBe(
        "Supplier delivery #12345"
      );
    });

    it("should add stock to a product with zero quantity", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 0 });
      const adjustmentData = createAddStockAdjustment(product._id, {
        quantity: 100,
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.product.quantity).toBe(100);
    });
  });
});

// ==================== STOCK ADJUSTMENT: REMOVE ====================

describe("PATCH /api/inventory/adjust (REMOVE)", () => {
  describe("Stock Adjustment Decrease", () => {
    it("should decrease stock successfully", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 80 });
      const adjustmentData = createRemoveStockAdjustment(product._id, {
        quantity: 30,
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.quantity).toBe(50); // 80 - 30
    });

    it("should record negative quantityChanged for REMOVE", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 60 });
      const adjustmentData = createRemoveStockAdjustment(product._id, {
        quantity: 15,
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.body.data.inventoryLog.quantityChanged).toBe(-15);
      expect(res.body.data.inventoryLog.previousQuantity).toBe(60);
      expect(res.body.data.inventoryLog.newQuantity).toBe(45);
    });

    it("should allow removing all stock (to zero)", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 25 });
      const adjustmentData = createRemoveStockAdjustment(product._id, {
        quantity: 25,
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.product.quantity).toBe(0);
    });
  });

  describe("Prevent Negative Stock", () => {
    it("should reject removal when quantity exceeds available stock", async () => {
      // Arrange - product has 10 units
      const product = await createTestProduct({ quantity: 10 });
      const adjustmentData = createRemoveStockAdjustment(product._id, {
        quantity: 50, // Request more than available
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Insufficient stock");
    });

    it("should reject removal from zero-stock product", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 0 });
      const adjustmentData = createRemoveStockAdjustment(product._id, {
        quantity: 1,
      });

      // Act
      const res = await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should not modify stock when removal is rejected", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 10 });
      const adjustmentData = createRemoveStockAdjustment(product._id, {
        quantity: 20,
      });

      // Act
      await admin.authenticatedAgent
        .patch("/api/inventory/adjust")
        .send(adjustmentData);

      // Assert - stock should remain unchanged
      const dbProduct = await Product.findById(product._id);
      expect(dbProduct.quantity).toBe(10);
    });
  });
});

// ==================== INVENTORY LOG VERIFICATION ====================

describe("Inventory Log Creation", () => {
  it("should create inventory log entry on ADD", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 20 });
    const adjustmentData = createAddStockAdjustment(product._id, {
      quantity: 10,
    });

    // Act
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(adjustmentData);

    // Assert - check database for log entry
    const logs = await InventoryLog.find({ productId: product._id });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("ADD");
    expect(logs[0].quantityChanged).toBe(10);
    expect(logs[0].previousQuantity).toBe(20);
    expect(logs[0].newQuantity).toBe(30);
  });

  it("should create inventory log entry on REMOVE", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const adjustmentData = createRemoveStockAdjustment(product._id, {
      quantity: 15,
    });

    // Act
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(adjustmentData);

    // Assert
    const logs = await InventoryLog.find({ productId: product._id });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("REMOVE");
    expect(logs[0].quantityChanged).toBe(-15);
  });

  it("should track multiple adjustments in sequence", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 100 });

    // Act - perform multiple adjustments
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createAddStockAdjustment(product._id, { quantity: 20 }));

    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createRemoveStockAdjustment(product._id, { quantity: 10 }));

    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createAddStockAdjustment(product._id, { quantity: 5 }));

    // Assert
    const logs = await InventoryLog.find({ productId: product._id }).sort({
      timestamp: 1,
    });
    expect(logs.length).toBe(3);

    // First adjustment: 100 + 20 = 120
    expect(logs[0].previousQuantity).toBe(100);
    expect(logs[0].newQuantity).toBe(120);

    // Second adjustment: 120 - 10 = 110
    expect(logs[1].previousQuantity).toBe(120);
    expect(logs[1].newQuantity).toBe(110);

    // Third adjustment: 110 + 5 = 115
    expect(logs[2].previousQuantity).toBe(110);
    expect(logs[2].newQuantity).toBe(115);

    // Verify final product quantity
    const dbProduct = await Product.findById(product._id);
    expect(dbProduct.quantity).toBe(115);
  });

  it("should record performer in inventory log", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const adjustmentData = createAddStockAdjustment(product._id, {
      quantity: 10,
    });

    // Act
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(adjustmentData);

    // Assert
    const logs = await InventoryLog.find({ productId: product._id });
    expect(logs[0].performedBy.toString()).toBe(admin.user._id.toString());
  });
});

// ==================== INVENTORY LOG RETRIEVAL ====================

describe("GET /api/inventory/logs", () => {
  it("should retrieve inventory logs", async () => {
    // Arrange - create some inventory adjustments
    const product = await createTestProduct({ quantity: 100 });
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createAddStockAdjustment(product._id, { quantity: 10 }));
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createRemoveStockAdjustment(product._id, { quantity: 5 }));

    // Act
    const res = await admin.authenticatedAgent.get("/api/inventory/logs");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
    expect(res.body.data.logs.length).toBe(2);
    expect(res.body.data.pagination).toBeDefined();
  });

  it("should reject access by Staff role", async () => {
    // Act
    const res = await staff.authenticatedAgent.get("/api/inventory/logs");

    // Assert
    expect(res.status).toBe(403);
  });

  it("should reject access without authentication", async () => {
    // Act
    const res = await request.get("/api/inventory/logs");

    // Assert
    expect(res.status).toBe(401);
  });
});

// ==================== PRODUCT-SPECIFIC INVENTORY LOGS ====================

describe("GET /api/inventory/logs/:productId", () => {
  it("should retrieve logs for a specific product", async () => {
    // Arrange
    const product1 = await createTestProduct({ quantity: 100 });
    const product2 = await createTestProduct({ quantity: 50 });

    // Create adjustments for both products
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createAddStockAdjustment(product1._id, { quantity: 10 }));
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createAddStockAdjustment(product2._id, { quantity: 5 }));

    // Act - get logs for product1 only
    const res = await admin.authenticatedAgent.get(
      `/api/inventory/logs/${product1._id}`
    );

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBe(1);
  });

  it("should return 404 for non-existent product", async () => {
    // Act
    const res = await admin.authenticatedAgent.get(
      "/api/inventory/logs/507f1f77bcf86cd799439011"
    );

    // Assert
    expect(res.status).toBe(404);
  });
});

// ==================== LOW STOCK DETECTION ====================

describe("Low Stock Detection", () => {
  it("should detect low stock after removal", async () => {
    // Arrange - product with minimumStockLevel of 10, quantity 15
    const product = await createTestProduct({
      quantity: 15,
      minimumStockLevel: 10,
    });

    // Act - remove stock to trigger low stock (15 - 10 = 5, which is < 10)
    const res = await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createRemoveStockAdjustment(product._id, { quantity: 10 }));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.product.quantity).toBe(5);

    // Verify the product is indeed low stock
    const dbProduct = await Product.findById(product._id);
    expect(dbProduct.quantity).toBeLessThanOrEqual(
      dbProduct.minimumStockLevel
    );
    expect(dbProduct.isLowStock()).toBe(true);
  });

  it("should not flag low stock when quantity is above threshold", async () => {
    // Arrange
    const product = await createTestProduct({
      quantity: 100,
      minimumStockLevel: 10,
    });

    // Act - small removal, stock stays well above minimum
    await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(createRemoveStockAdjustment(product._id, { quantity: 5 }));

    // Assert
    const dbProduct = await Product.findById(product._id);
    expect(dbProduct.quantity).toBe(95);
    expect(dbProduct.isLowStock()).toBe(false);
  });

  it("should correctly identify exact threshold as low stock", async () => {
    // Arrange - quantity equals minimumStockLevel
    const product = await createTestProduct({
      quantity: 10,
      minimumStockLevel: 10,
    });

    // Assert - at threshold should be considered low stock
    const dbProduct = await Product.findById(product._id);
    expect(dbProduct.isLowStock()).toBe(true);
  });
});

// ==================== AUTHORIZATION CHECKS ====================

describe("Inventory Authorization", () => {
  it("should reject stock adjustment by Staff role", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const adjustmentData = createAddStockAdjustment(product._id, {
      quantity: 10,
    });

    // Act
    const res = await staff.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(adjustmentData);

    // Assert
    expect(res.status).toBe(403);
  });

  it("should reject stock adjustment without authentication", async () => {
    // Act
    const res = await request.patch("/api/inventory/adjust").send({
      productId: "507f1f77bcf86cd799439011",
      adjustmentType: "ADD",
      quantity: 10,
    });

    // Assert
    expect(res.status).toBe(401);
  });
});

// ==================== VALIDATION CHECKS ====================

describe("Inventory Validation", () => {
  it("should reject adjustment for non-existent product", async () => {
    // Arrange
    const adjustmentData = createAddStockAdjustment(
      "507f1f77bcf86cd799439011",
      { quantity: 10 }
    );

    // Act
    const res = await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(adjustmentData);

    // Assert
    expect(res.status).toBe(404);
  });

  it("should reject adjustment with zero quantity", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const adjustmentData = createAddStockAdjustment(product._id, {
      quantity: 0,
    });

    // Act
    const res = await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(adjustmentData);

    // Assert - validators throw plain Error, error handler returns 500
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject adjustment with negative quantity", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const adjustmentData = createAddStockAdjustment(product._id, {
      quantity: -5,
    });

    // Act
    const res = await admin.authenticatedAgent
      .patch("/api/inventory/adjust")
      .send(adjustmentData);

    // Assert
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});
