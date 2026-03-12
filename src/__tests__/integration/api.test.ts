import request from "supertest";
import app from "../../app";
import prisma from "../../db";

let token: string;
let userId: string;

beforeAll(async () => {
  // Clean up test data
  await prisma.passwordReset.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.passwordReset.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("Health check", () => {
  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Auth API", () => {
  const testEmail = "test@example.com";
  const testPassword = "password123";

  test("POST /api/auth/register creates a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: testEmail, password: testPassword, name: "Test User" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe("Test User");
    expect(res.body.token).toBeDefined();
    token = res.body.token;
    userId = res.body.user.id;
  });

  test("POST /api/auth/register rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(409);
  });

  test("POST /api/auth/register validates required fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "", password: "" });

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/register requires minimum password length", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "short@test.com", password: "short" });

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/login authenticates valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.token).toBeDefined();
  });

  test("POST /api/auth/login rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me returns current user", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
  });

  test("GET /api/auth/me rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Habits API", () => {
  let habitId: string;

  test("POST /api/habits creates a habit", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Exercise", description: "Daily workout", frequency: "daily", color: "#ff5733" });

    expect(res.status).toBe(201);
    expect(res.body.habit.name).toBe("Exercise");
    expect(res.body.habit.frequency).toBe("daily");
    expect(res.body.habit.color).toBe("#ff5733");
    habitId = res.body.habit.id;
  });

  test("POST /api/habits validates name is required", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  test("POST /api/habits validates frequency format", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bad freq", frequency: "invalid" });

    expect(res.status).toBe(400);
  });

  test("POST /api/habits validates color format", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bad color", color: "not-a-color" });

    expect(res.status).toBe(400);
  });

  test("POST /api/habits rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/habits")
      .send({ name: "Unauthorized" });

    expect(res.status).toBe(401);
  });

  test("GET /api/habits lists user habits", async () => {
    const res = await request(app)
      .get("/api/habits")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.habits).toHaveLength(1);
    expect(res.body.habits[0].name).toBe("Exercise");
  });

  test("PUT /api/habits/:id updates a habit", async () => {
    const res = await request(app)
      .put(`/api/habits/${habitId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Morning Run" });

    expect(res.status).toBe(200);
    expect(res.body.habit.name).toBe("Morning Run");
  });

  test("PUT /api/habits/:id returns 404 for non-existent habit", async () => {
    const res = await request(app)
      .put("/api/habits/nonexistent")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });

  test("GET /api/habits/:id/streaks returns streak data", async () => {
    const res = await request(app)
      .get(`/api/habits/${habitId}/streaks`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("currentStreak");
    expect(res.body).toHaveProperty("bestStreak");
    expect(res.body).toHaveProperty("completionRate");
    expect(typeof res.body.currentStreak).toBe("number");
  });

  test("DELETE /api/habits/:id deletes a habit", async () => {
    // Create a disposable habit for deletion
    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "To Delete" });

    const deleteId = createRes.body.habit.id;

    const res = await request(app)
      .delete(`/api/habits/${deleteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Habit deleted");
  });
});

describe("Check-ins API", () => {
  let habitId: string;
  let checkInId: string;

  beforeAll(async () => {
    // Get existing habit
    const res = await request(app)
      .get("/api/habits")
      .set("Authorization", `Bearer ${token}`);
    habitId = res.body.habits[0].id;
  });

  test("POST /api/check-ins creates a check-in", async () => {
    const res = await request(app)
      .post("/api/check-ins")
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId, date: "2025-03-10", status: "done" });

    expect(res.status).toBe(201);
    expect(res.body.checkIn.status).toBe("done");
    expect(res.body.checkIn.date).toBe("2025-03-10");
    checkInId = res.body.checkIn.id;
  });

  test("POST /api/check-ins upserts on same habit+date", async () => {
    const res = await request(app)
      .post("/api/check-ins")
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId, date: "2025-03-10", status: "skipped" });

    expect(res.status).toBe(201);
    expect(res.body.checkIn.status).toBe("skipped");
  });

  test("POST /api/check-ins validates date format", async () => {
    const res = await request(app)
      .post("/api/check-ins")
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId, date: "invalid", status: "done" });

    expect(res.status).toBe(400);
  });

  test("POST /api/check-ins validates status", async () => {
    const res = await request(app)
      .post("/api/check-ins")
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId, date: "2025-03-10", status: "invalid" });

    expect(res.status).toBe(400);
  });

  test("GET /api/check-ins returns check-ins for date", async () => {
    const res = await request(app)
      .get("/api/check-ins?date=2025-03-10")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.checkIns).toHaveLength(1);
  });

  test("GET /api/check-ins validates date parameter", async () => {
    const res = await request(app)
      .get("/api/check-ins")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test("DELETE /api/check-ins/:id removes a check-in", async () => {
    // First get the current check-in ID
    const listRes = await request(app)
      .get("/api/check-ins?date=2025-03-10")
      .set("Authorization", `Bearer ${token}`);

    const id = listRes.body.checkIns[0].id;

    const res = await request(app)
      .delete(`/api/check-ins/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Check-in removed");
  });

  test("DELETE /api/check-ins/:id returns 404 for non-existent", async () => {
    const res = await request(app)
      .delete("/api/check-ins/nonexistent")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("Analytics API", () => {
  test("GET /api/analytics/overview returns dashboard data", async () => {
    const res = await request(app)
      .get("/api/analytics/overview")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("weekCompletionRate");
    expect(res.body).toHaveProperty("monthCompletionRate");
    expect(res.body).toHaveProperty("totalCheckIns");
    expect(res.body).toHaveProperty("longestStreak");
    expect(res.body).toHaveProperty("activeHabits");
    expect(res.body).toHaveProperty("dailyActivity");
    expect(res.body).toHaveProperty("habitStats");
    expect(typeof res.body.weekCompletionRate).toBe("number");
    expect(Array.isArray(res.body.habitStats)).toBe(true);
  });

  test("GET /api/analytics/overview rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/analytics/overview");
    expect(res.status).toBe(401);
  });
});

describe("Account Management API", () => {
  test("PUT /api/auth/profile updates user profile", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Updated Name");
  });

  test("PUT /api/auth/profile rejects duplicate email", async () => {
    // Register another user
    await request(app)
      .post("/api/auth/register")
      .send({ email: "other@example.com", password: "password123" });

    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "other@example.com" });

    expect(res.status).toBe(409);
  });

  test("PUT /api/auth/password changes password", async () => {
    const res = await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "password123", newPassword: "newpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password updated successfully");

    // Verify new password works
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "newpassword123" });
    expect(loginRes.status).toBe(200);

    // Change back for other tests
    await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "newpassword123", newPassword: "password123" });
  });

  test("PUT /api/auth/password rejects wrong current password", async () => {
    const res = await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "wrongpassword", newPassword: "newpassword123" });

    expect(res.status).toBe(401);
  });

  test("PUT /api/auth/password validates new password length", async () => {
    const res = await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "password123", newPassword: "short" });

    expect(res.status).toBe(400);
  });

  test("DELETE /api/auth/account rejects wrong password", async () => {
    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  test("DELETE /api/auth/account deletes user account", async () => {
    // Create a disposable user
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "todelete@example.com", password: "password123" });

    const deleteToken = regRes.body.token;

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", `Bearer ${deleteToken}`)
      .send({ password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Account deleted successfully");

    // Verify account is gone
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "todelete@example.com", password: "password123" });
    expect(loginRes.status).toBe(401);
  });
});

describe("Password Reset API", () => {
  test("POST /api/auth/forgot-password returns success for any email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nonexistent@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("reset link has been sent");
  });

  test("POST /api/auth/forgot-password requires email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/forgot-password creates reset token for valid user", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);

    // Verify token was created in DB
    const resets = await prisma.passwordReset.findMany({
      where: { user: { email: "test@example.com" }, used: false },
    });
    expect(resets.length).toBe(1);
    expect(resets[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test("POST /api/auth/reset-password resets password with valid token", async () => {
    // Get the token created in previous test
    const resetRecord = await prisma.passwordReset.findFirst({
      where: { user: { email: "test@example.com" }, used: false },
    });
    expect(resetRecord).not.toBeNull();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: resetRecord!.token, newPassword: "resetpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("reset successfully");

    // Verify new password works
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "resetpassword123" });
    expect(loginRes.status).toBe(200);

    // Reset back for other tests
    token = loginRes.body.token;
    await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "resetpassword123", newPassword: "password123" });
  });

  test("POST /api/auth/reset-password rejects expired token", async () => {
    // Create an expired token
    const expired = await prisma.passwordReset.create({
      data: {
        token: "expired-token-123",
        expiresAt: new Date(Date.now() - 1000), // already expired
        userId: userId,
      },
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: expired.token, newPassword: "newpassword123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid or expired");
  });

  test("POST /api/auth/reset-password rejects used token", async () => {
    const used = await prisma.passwordReset.create({
      data: {
        token: "used-token-123",
        expiresAt: new Date(Date.now() + 3600000),
        userId: userId,
        used: true,
      },
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: used.token, newPassword: "newpassword123" });

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/reset-password validates password length", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "any-token", newPassword: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("8 characters");
  });
});

describe("Export API", () => {
  test("GET /api/export returns JSON export", async () => {
    const res = await request(app)
      .get("/api/export?format=json")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body).toHaveProperty("exportedAt");
    expect(res.body).toHaveProperty("habits");
    expect(Array.isArray(res.body.habits)).toBe(true);

    if (res.body.habits.length > 0) {
      const habit = res.body.habits[0];
      expect(habit).toHaveProperty("name");
      expect(habit).toHaveProperty("frequency");
      expect(habit).toHaveProperty("currentStreak");
      expect(habit).toHaveProperty("bestStreak");
      expect(habit).toHaveProperty("checkIns");
    }
  });

  test("GET /api/export returns CSV export", async () => {
    const res = await request(app)
      .get("/api/export?format=csv")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.text).toContain("Habit");
    expect(res.text).toContain("Check-in Date");
  });

  test("GET /api/export defaults to JSON", async () => {
    const res = await request(app)
      .get("/api/export")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("habits");
  });

  test("GET /api/export rejects invalid format", async () => {
    const res = await request(app)
      .get("/api/export?format=xml")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test("GET /api/export rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/export");
    expect(res.status).toBe(401);
  });
});
