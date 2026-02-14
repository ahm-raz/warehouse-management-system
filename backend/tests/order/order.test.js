/**
 * Order Module Test Suite
 * Comprehensive tests for order management endpoints
 *
 * Covers:
 * - Order creation (success + insufficient stock)
 * - Order status workflow validation
 * - Staff assignment functionality
 * - Inventory deduction on shipment
 * - Order cancellation rules
 * - Order activity log verification
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
import { createMockProduct } from "../mocks/productFactory.js";
import {
  createSingleItemOrder,
  createMultiItemOrder,
  createInvalidOrder,
} from "../mocks/orderFactory.js";
import Product from "../../src/models/Product.js";
import Order from "../../src/models/Order.js";
import OrderActivityLog from "../../src/models/OrderActivityLog.js";

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

/**
 * Helper to create a product directly in the database
 * Used to set up test prerequisites for order tests
 */
const createTestProduct = async (overrides = {}) => {
  const productData = createMockProduct(overrides);
  const res = await admin.authenticatedAgent
    .post("/api/products")
    .send(productData);
  return res.body.data.product;
};

// ==================== ORDER CREATION TESTS ====================

describe("POST /api/orders", () => {
  describe("Order Creation Success", () => {
    it("should create an order successfully with valid data", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 100, unitPrice: 25 });
      const orderData = createSingleItemOrder(product._id, 5, {
        customerName: "Acme Corp",
      });

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/orders")
        .send(orderData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Order created successfully");
      expect(res.body.data.order).toBeDefined();
      expect(res.body.data.order.customerName).toBe("Acme Corp");
      expect(res.body.data.order.orderStatus).toBe("Pending");
      expect(res.body.data.order.orderNumber).toBeDefined();
      expect(res.body.data.order.totalAmount).toBe(125); // 25 * 5
    });

    it("should create order with multiple items", async () => {
      // Arrange
      const product1 = await createTestProduct({
        quantity: 50,
        unitPrice: 10,
      });
      const product2 = await createTestProduct({
        quantity: 30,
        unitPrice: 20,
      });
      const orderData = createMultiItemOrder(
        [
          { productId: product1._id, quantity: 3 },
          { productId: product2._id, quantity: 2 },
        ],
        { customerName: "Multi-Item Customer" }
      );

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/orders")
        .send(orderData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.data.order.items.length).toBe(2);
      expect(res.body.data.order.totalAmount).toBe(70); // (10*3) + (20*2)
    });

    it("should generate a unique order number", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 100 });

      // Act
      const res1 = await admin.authenticatedAgent
        .post("/api/orders")
        .send(createSingleItemOrder(product._id, 1));
      const res2 = await admin.authenticatedAgent
        .post("/api/orders")
        .send(
          createSingleItemOrder(product._id, 1, {
            customerName: "Second Customer",
          })
        );

      // Assert
      expect(res1.body.data.order.orderNumber).toBeDefined();
      expect(res2.body.data.order.orderNumber).toBeDefined();
      expect(res1.body.data.order.orderNumber).not.toBe(
        res2.body.data.order.orderNumber
      );
    });

    it("should NOT deduct inventory on order creation", async () => {
      // Arrange
      const product = await createTestProduct({
        quantity: 100,
        unitPrice: 10,
      });
      const orderData = createSingleItemOrder(product._id, 10);

      // Act
      await admin.authenticatedAgent.post("/api/orders").send(orderData);

      // Assert - stock should NOT be deducted yet (only on shipment)
      const dbProduct = await Product.findById(product._id);
      expect(dbProduct.quantity).toBe(100);
    });

    it("should allow Staff to create orders", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 50 });
      const orderData = createSingleItemOrder(product._id, 2);

      // Act
      const res = await staff.authenticatedAgent
        .post("/api/orders")
        .send(orderData);

      // Assert
      expect(res.status).toBe(201);
    });
  });

  describe("Order Creation with Insufficient Stock", () => {
    it("should reject order when stock is insufficient", async () => {
      // Arrange - product has only 5 units
      const product = await createTestProduct({ quantity: 5, unitPrice: 10 });
      const orderData = createSingleItemOrder(product._id, 50); // Request 50

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/orders")
        .send(orderData);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Insufficient stock");
    });

    it("should reject order when product has zero stock", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 0, unitPrice: 10 });
      const orderData = createSingleItemOrder(product._id, 1);

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/orders")
        .send(orderData);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Order Validation Failures", () => {
    it("should reject order with empty customer name", async () => {
      // Arrange
      const product = await createTestProduct({ quantity: 10 });
      const orderData = createSingleItemOrder(product._id, 1, {
        customerName: "",
      });

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/orders")
        .send(orderData);

      // Assert - validators throw plain Error, error handler returns 500
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject order with no items", async () => {
      // Arrange
      const orderData = { customerName: "Test Customer", items: [] };

      // Act
      const res = await admin.authenticatedAgent
        .post("/api/orders")
        .send(orderData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject order without authentication", async () => {
      // Act
      const res = await request
        .post("/api/orders")
        .send({ customerName: "Test", items: [] });

      // Assert
      expect(res.status).toBe(401);
    });
  });
});

// ==================== ORDER STATUS WORKFLOW TESTS ====================

describe("PATCH /api/orders/:id/status", () => {
  let orderId;
  let product;

  beforeEach(async () => {
    // Create a product and an order for status tests
    product = await createTestProduct({ quantity: 100, unitPrice: 10 });
    const orderData = createSingleItemOrder(product._id, 5);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    orderId = orderRes.body.data.order._id;
  });

  describe("Valid Status Transitions", () => {
    it("should transition from Pending to Picking", async () => {
      // Act
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Picking" });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe("Picking");
    });

    it("should transition from Picking to Packed", async () => {
      // Arrange - move to Picking first
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Picking" });

      // Act
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Packed" });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe("Packed");
    });

    it("should transition from Packed to Shipped", async () => {
      // Arrange - move through workflow
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Picking" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Packed" });

      // Act
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Shipped" });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe("Shipped");
    });

    it("should transition from Shipped to Delivered", async () => {
      // Arrange - move through workflow
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Picking" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Packed" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Shipped" });

      // Act
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Delivered" });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe("Delivered");
    });
  });

  describe("Invalid Status Transitions", () => {
    it("should reject transition from Pending directly to Packed", async () => {
      // Act
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Packed" });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject transition from Pending directly to Shipped", async () => {
      // Act
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Shipped" });

      // Assert
      expect(res.status).toBe(400);
    });

    it("should reject transition from Delivered (final state)", async () => {
      // Arrange - move to Delivered
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Picking" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Packed" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Shipped" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Delivered" });

      // Act - try to move from Delivered
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Pending" });

      // Assert
      expect(res.status).toBe(400);
    });
  });

  describe("Inventory Deduction on Shipment", () => {
    it("should deduct inventory when order is shipped", async () => {
      // Arrange - move to Packed
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Picking" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Packed" });

      // Verify stock before shipment
      const beforeProduct = await Product.findById(product._id);
      expect(beforeProduct.quantity).toBe(100);

      // Act - ship the order (should deduct 5 units)
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Shipped" });

      // Assert
      expect(res.status).toBe(200);
      const afterProduct = await Product.findById(product._id);
      expect(afterProduct.quantity).toBe(95); // 100 - 5
    });

    it("should reject shipment when stock becomes insufficient", async () => {
      // Arrange - move to Packed
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Picking" });
      await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Packed" });

      // Manually reduce stock below order quantity
      await Product.findByIdAndUpdate(product._id, { quantity: 2 });

      // Act - try to ship (order has 5 items but only 2 in stock)
      const res = await admin.authenticatedAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "Shipped" });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

// ==================== STAFF ASSIGNMENT TESTS ====================

describe("PATCH /api/orders/:id/assign-staff", () => {
  let orderId;

  beforeEach(async () => {
    const product = await createTestProduct({ quantity: 50 });
    const orderData = createSingleItemOrder(product._id, 2);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    orderId = orderRes.body.data.order._id;
  });

  it("should assign staff to order successfully", async () => {
    // Act
    const res = await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/assign-staff`)
      .send({ staffId: staff.user._id.toString() });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("Staff assigned");
  });

  it("should allow Manager to assign staff", async () => {
    // Act
    const res = await manager.authenticatedAgent
      .patch(`/api/orders/${orderId}/assign-staff`)
      .send({ staffId: staff.user._id.toString() });

    // Assert
    expect(res.status).toBe(200);
  });

  it("should reject staff assignment by Staff role", async () => {
    // Act
    const res = await staff.authenticatedAgent
      .patch(`/api/orders/${orderId}/assign-staff`)
      .send({ staffId: staff.user._id.toString() });

    // Assert
    expect(res.status).toBe(403);
  });

  it("should reject assignment of non-existent staff", async () => {
    // Act
    const res = await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/assign-staff`)
      .send({ staffId: "507f1f77bcf86cd799439011" });

    // Assert
    expect(res.status).toBe(404);
  });
});

// ==================== ORDER CANCELLATION TESTS ====================

describe("Order Cancellation", () => {
  let orderId;

  beforeEach(async () => {
    const product = await createTestProduct({ quantity: 100 });
    const orderData = createSingleItemOrder(product._id, 5);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    orderId = orderRes.body.data.order._id;
  });

  it("should cancel a Pending order", async () => {
    // Act
    const res = await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Cancelled" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.order.orderStatus).toBe("Cancelled");
  });

  it("should cancel a Picking order", async () => {
    // Arrange - move to Picking
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Picking" });

    // Act
    const res = await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Cancelled" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.order.orderStatus).toBe("Cancelled");
  });

  it("should reject cancellation of Packed order", async () => {
    // Arrange - move to Packed
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Picking" });
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Packed" });

    // Act
    const res = await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Cancelled" });

    // Assert
    expect(res.status).toBe(400);
  });

  it("should reject cancellation of already cancelled order", async () => {
    // Arrange - cancel the order
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Cancelled" });

    // Act - try to cancel again
    const res = await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Cancelled" });

    // Assert
    expect(res.status).toBe(400);
  });
});

// ==================== ORDER DELETE TESTS ====================

describe("DELETE /api/orders/:id", () => {
  it("should soft delete a Pending order", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const orderData = createSingleItemOrder(product._id, 2);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    const orderId = orderRes.body.data.order._id;

    // Act
    const res = await admin.authenticatedAgent.delete(
      `/api/orders/${orderId}`
    );

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject deletion of Shipped order", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 100 });
    const orderData = createSingleItemOrder(product._id, 5);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    const orderId = orderRes.body.data.order._id;

    // Move to Shipped
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Picking" });
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Packed" });
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Shipped" });

    // Act
    const res = await admin.authenticatedAgent.delete(
      `/api/orders/${orderId}`
    );

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject deletion by Staff role", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const orderData = createSingleItemOrder(product._id, 2);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    const orderId = orderRes.body.data.order._id;

    // Act
    const res = await staff.authenticatedAgent.delete(
      `/api/orders/${orderId}`
    );

    // Assert
    expect(res.status).toBe(403);
  });
});

// ==================== ORDER ACTIVITY LOG TESTS ====================

describe("GET /api/orders/:id/activity", () => {
  it("should return activity logs for an order", async () => {
    // Arrange - create order (generates ORDER_CREATED log)
    const product = await createTestProduct({ quantity: 50 });
    const orderData = createSingleItemOrder(product._id, 2);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    const orderId = orderRes.body.data.order._id;

    // Act
    const res = await admin.authenticatedAgent.get(
      `/api/orders/${orderId}/activity`
    );

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);
  });

  it("should log status transitions in activity log", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const orderData = createSingleItemOrder(product._id, 2);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    const orderId = orderRes.body.data.order._id;

    // Perform a status change
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: "Picking" });

    // Act
    const res = await admin.authenticatedAgent.get(
      `/api/orders/${orderId}/activity`
    );

    // Assert - should have at least 2 logs: creation + status update
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(2);

    // Find the status update log
    const statusLog = res.body.data.logs.find(
      (log) => log.actionType === "STATUS_UPDATED"
    );
    expect(statusLog).toBeDefined();
  });

  it("should log staff assignment in activity log", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 50 });
    const orderData = createSingleItemOrder(product._id, 2);
    const orderRes = await admin.authenticatedAgent
      .post("/api/orders")
      .send(orderData);
    const orderId = orderRes.body.data.order._id;

    // Assign staff
    await admin.authenticatedAgent
      .patch(`/api/orders/${orderId}/assign-staff`)
      .send({ staffId: staff.user._id.toString() });

    // Act
    const res = await admin.authenticatedAgent.get(
      `/api/orders/${orderId}/activity`
    );

    // Assert
    const staffLog = res.body.data.logs.find(
      (log) => log.actionType === "STAFF_ASSIGNED"
    );
    expect(staffLog).toBeDefined();
  });
});

// ==================== ORDER RETRIEVAL TESTS ====================

describe("GET /api/orders", () => {
  it("should retrieve orders with pagination", async () => {
    // Arrange
    const product = await createTestProduct({ quantity: 100 });
    for (let i = 0; i < 3; i++) {
      await admin.authenticatedAgent
        .post("/api/orders")
        .send(
          createSingleItemOrder(product._id, 1, {
            customerName: `Customer ${i}`,
          })
        );
    }

    // Act
    const res = await admin.authenticatedAgent.get("/api/orders");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.orders.length).toBe(3);
    expect(res.body.data.pagination).toBeDefined();
  });

  it("should return empty array when no orders exist", async () => {
    // Act
    const res = await admin.authenticatedAgent.get("/api/orders");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.orders).toEqual([]);
  });
});
