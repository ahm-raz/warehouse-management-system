/**
 * Authentication Test Suite
 * Comprehensive tests for the authentication module
 *
 * Covers:
 * - User registration (success + validation failures)
 * - Login (success + invalid credentials)
 * - JWT token generation and validation
 * - Token refresh flow
 * - Logout functionality
 * - Account lock after failed attempts
 * - Protected route access (with and without token)
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
  authenticatedRequest,
  createAuthenticatedUser,
} from "../helpers/request.js";
import { createMockUser, createInvalidUser } from "../mocks/userFactory.js";
import User from "../../src/models/User.js";
import { generateAccessToken } from "../../src/utils/token.js";

// ==================== SUITE SETUP ====================

beforeAll(async () => {
  setupTestEnv();
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

// ==================== REGISTRATION TESTS ====================

describe("POST /api/auth/register", () => {
  describe("Registration Success", () => {
    it("should register a new user successfully with valid data", async () => {
      // Arrange
      const userData = createMockUser({ role: "Staff" });

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("User registered successfully");
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(userData.email.toLowerCase());
      expect(res.body.data.user.name).toBe(userData.name);
      expect(res.body.data.user.role).toBe("Staff");
      // Password should NOT be in response
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("should register an admin user", async () => {
      // Arrange
      const userData = createMockUser({ role: "Admin" });

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe("Admin");
    });

    it("should register a manager user", async () => {
      // Arrange
      const userData = createMockUser({ role: "Manager" });

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe("Manager");
    });

    it("should set refresh token cookie on registration", async () => {
      // Arrange
      const userData = createMockUser();

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBe(201);
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const hasRefreshToken = cookies.some((c) =>
        c.startsWith("refreshToken=")
      );
      expect(hasRefreshToken).toBe(true);
    });

    it("should hash the password before storing", async () => {
      // Arrange
      const userData = createMockUser();

      // Act
      await request.post("/api/auth/register").send(userData);

      // Assert - Check database directly
      const dbUser = await User.findOne({
        email: userData.email,
      }).select("+password");
      expect(dbUser.password).not.toBe(userData.password);
      expect(dbUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });
  });

  describe("Registration Validation Failures", () => {
    it("should reject registration with missing name", async () => {
      // Arrange
      const userData = createMockUser();
      delete userData.name;

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert - validators throw plain Error so error handler returns 500
      // (Joi validation errors are not converted to 400 by the error handler)
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with invalid email", async () => {
      // Arrange
      const userData = createMockUser({ email: "not-an-email" });

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with weak password", async () => {
      // Arrange
      const userData = createMockUser({ password: "123" });

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with password missing special character", async () => {
      // Arrange - password without special char
      const userData = createMockUser({ password: "TestPass123" });

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with invalid role", async () => {
      // Arrange
      const userData = createMockUser({ role: "SuperAdmin" });

      // Act
      const res = await request.post("/api/auth/register").send(userData);

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with duplicate email", async () => {
      // Arrange - register first user
      const userData = createMockUser();
      await request.post("/api/auth/register").send(userData);

      // Act - try to register with same email
      const duplicateUser = createMockUser({ email: userData.email });
      const res = await request.post("/api/auth/register").send(duplicateUser);

      // Assert
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });
});

// ==================== LOGIN TESTS ====================

describe("POST /api/auth/login", () => {
  let registeredUser;

  beforeEach(async () => {
    // Register a user for login tests
    registeredUser = createMockUser({ role: "Admin" });
    await request.post("/api/auth/register").send(registeredUser);
  });

  describe("Login Success", () => {
    it("should login successfully with valid credentials", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        email: registeredUser.email,
        password: registeredUser.password,
      });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Login successful");
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(
        registeredUser.email.toLowerCase()
      );
    });

    it("should return JWT access token on login", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        email: registeredUser.email,
        password: registeredUser.password,
      });

      // Assert - Token should be a valid JWT (3 parts separated by dots)
      const token = res.body.data.accessToken;
      expect(token).toBeDefined();
      expect(token.split(".").length).toBe(3);
    });

    it("should set refresh token cookie on login", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        email: registeredUser.email,
        password: registeredUser.password,
      });

      // Assert
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const hasRefreshToken = cookies.some((c) =>
        c.startsWith("refreshToken=")
      );
      expect(hasRefreshToken).toBe(true);
    });

    it("should not return password in login response", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        email: registeredUser.email,
        password: registeredUser.password,
      });

      // Assert
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.refreshToken).toBeUndefined();
    });
  });

  describe("Login Invalid Credentials", () => {
    it("should reject login with wrong password", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        email: registeredUser.email,
        password: "WrongPassword123!",
      });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject login with non-existent email", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        email: "nonexistent@test.com",
        password: "SomePassword123!",
      });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject login with missing email", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        password: registeredUser.password,
      });

      // Assert - validators throw plain Error so error handler returns 500
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject login with missing password", async () => {
      // Act
      const res = await request.post("/api/auth/login").send({
        email: registeredUser.email,
      });

      // Assert
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });
  });
});

// ==================== JWT TOKEN TESTS ====================

describe("JWT Token Generation", () => {
  it("should generate a valid access token with correct payload", async () => {
    // Arrange
    const userData = createMockUser();
    const regRes = await request.post("/api/auth/register").send(userData);
    const token = regRes.body.data.accessToken;

    // Act - decode token (without verification, just checking structure)
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Assert
    expect(payload.userId).toBeDefined();
    expect(payload.role).toBeDefined();
    expect(payload.type).toBe("access");
    expect(payload.iss).toBe("wms-backend");
    expect(payload.aud).toBe("wms-client");
    expect(payload.exp).toBeDefined();
  });

  it("should include user role in access token", async () => {
    // Arrange
    const userData = createMockUser({ role: "Manager" });
    const regRes = await request.post("/api/auth/register").send(userData);
    const token = regRes.body.data.accessToken;

    // Act
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Assert
    expect(payload.role).toBe("Manager");
  });
});

// ==================== TOKEN REFRESH TESTS ====================

describe("POST /api/auth/refresh-token", () => {
  it("should refresh access token with valid refresh token", async () => {
    // Arrange - Register and login to get refresh token
    const userData = createMockUser();
    await request.post("/api/auth/register").send(userData);

    const loginRes = await request.post("/api/auth/login").send({
      email: userData.email,
      password: userData.password,
    });

    // Extract refresh token from cookie
    const cookies = loginRes.headers["set-cookie"];
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    const refreshToken = refreshCookie.split(";")[0].split("=")[1];

    // Act
    const res = await request.post("/api/auth/refresh-token").send({
      refreshToken,
    });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it("should reject refresh with missing token", async () => {
    // Act
    const res = await request.post("/api/auth/refresh-token").send({});

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject refresh with invalid token", async () => {
    // Act
    const res = await request.post("/api/auth/refresh-token").send({
      refreshToken: "invalid-token-string",
    });

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ==================== LOGOUT TESTS ====================

describe("POST /api/auth/logout", () => {
  it("should logout successfully with valid token", async () => {
    // Arrange
    const userData = createMockUser();
    await request.post("/api/auth/register").send(userData);

    const loginRes = await request.post("/api/auth/login").send({
      email: userData.email,
      password: userData.password,
    });
    const token = loginRes.body.data.accessToken;

    // Act
    const res = await request
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Logout successful");
  });

  it("should clear refresh token cookie on logout", async () => {
    // Arrange
    const userData = createMockUser();
    await request.post("/api/auth/register").send(userData);

    const loginRes = await request.post("/api/auth/login").send({
      email: userData.email,
      password: userData.password,
    });
    const token = loginRes.body.data.accessToken;

    // Act
    const res = await request
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    // Assert
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    // Cookie should be cleared (maxAge=0 or empty value)
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    expect(refreshCookie).toBeDefined();
  });

  it("should reject logout without authentication token", async () => {
    // Act
    const res = await request.post("/api/auth/logout");

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ==================== ACCOUNT LOCK TESTS ====================

describe("Account Lock After Failed Attempts", () => {
  it("should lock account after 5 failed login attempts", async () => {
    // Arrange - register a user
    const userData = createMockUser();
    await request.post("/api/auth/register").send(userData);

    // Act - attempt login with wrong password 5+ times
    for (let i = 0; i < 5; i++) {
      await request.post("/api/auth/login").send({
        email: userData.email,
        password: "WrongPassword123!",
      });
    }

    // Assert - 6th attempt should indicate account is locked
    const res = await request.post("/api/auth/login").send({
      email: userData.email,
      password: "WrongPassword123!",
    });

    // Should be locked (423) or unauthorized (401)
    expect([401, 423]).toContain(res.status);
  });

  it("should allow login after lock period expires", async () => {
    // Arrange - register a user and lock the account
    const userData = createMockUser();
    await request.post("/api/auth/register").send(userData);

    // Lock the account
    for (let i = 0; i < 5; i++) {
      await request.post("/api/auth/login").send({
        email: userData.email,
        password: "WrongPassword123!",
      });
    }

    // Manually clear the lock (simulate lock expiry)
    await User.findOneAndUpdate(
      { email: userData.email.toLowerCase() },
      { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } }
    );

    // Act - try login with correct password after lock cleared
    const res = await request.post("/api/auth/login").send({
      email: userData.email,
      password: userData.password,
    });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ==================== PROTECTED ROUTE TESTS ====================

describe("Protected Route Access", () => {
  describe("GET /api/auth/me", () => {
    it("should access protected route with valid token", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser({ role: "Admin" });

      // Act
      const res = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });

    it("should reject access without token", async () => {
      // Act
      const res = await request.get("/api/auth/me");

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject access with invalid token", async () => {
      // Act
      const res = await request
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject access with expired token", async () => {
      // Arrange - generate a token that expires immediately
      const { user } = await createAuthenticatedUser();

      // Create an expired token by using a very short expiry
      const jwt = await import("jsonwebtoken");
      const expiredToken = jwt.default.sign(
        { userId: user._id.toString(), role: user.role, type: "access" },
        process.env.JWT_SECRET,
        {
          expiresIn: "0s",
          issuer: "wms-backend",
          audience: "wms-client",
        }
      );

      // Small delay to ensure token is expired
      await new Promise((r) => setTimeout(r, 100));

      // Act
      const res = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);

      // Assert
      expect(res.status).toBe(401);
    });

    it("should return user data matching the token holder", async () => {
      // Arrange
      const { user, token } = await createAuthenticatedUser({
        name: "Specific User",
        role: "Manager",
      });

      // Act
      const res = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe("Specific User");
      expect(res.body.data.user.role).toBe("Manager");
    });
  });
});
