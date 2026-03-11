import request from "supertest";
import app from "../../app";
import prisma from "../../db";

let token: string;
let userId: string;

beforeAll(async () => {
  // Clean up test data
  await prisma.checkIn.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
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
