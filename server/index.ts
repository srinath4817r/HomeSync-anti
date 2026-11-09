import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { startReminderScheduler } from "./services/reminderScheduler";

// Import all routes
import authRoutes from "./routes/auth";
import familyRoutes from "./routes/families";
import dashboardRoutes from "./routes/dashboard";
import calendarRoutes from "./routes/calendar";
import taskRoutes from "./routes/tasks";
import groceryRoutes from "./routes/groceries";
import locationRoutes from "./routes/location";
import placeRoutes from "./routes/places";
import careRoutes from "./routes/care";
import requestRoutes from "./routes/requests";
import financeRoutes from "./routes/finance";
import inventoryRoutes from "./routes/inventory";
import documentRoutes from "./routes/documents";
import aiRoutes from "./routes/ai";
import notificationRoutes from "./routes/notifications";

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "3001", 10);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
app.use(
  cors({
    origin: [clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads directory
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(uploadDir)));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "HomeSync API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/families", dashboardRoutes);
app.use("/api/families", calendarRoutes);
app.use("/api/families", taskRoutes);
app.use("/api/families", groceryRoutes);
app.use("/api/families", locationRoutes);
app.use("/api/families", placeRoutes);
app.use("/api/families", careRoutes);
app.use("/api/families", requestRoutes);
app.use("/api/families", financeRoutes);
app.use("/api/families", inventoryRoutes);
app.use("/api/families", documentRoutes);
app.use("/api/families", aiRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);

// Production Static Client (Single URL deployment)
const distPath = path.resolve(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API Error]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Start server
app.listen(port, () => {
  console.log(`[HomeSync API] Server listening on http://localhost:${port}`);
  startReminderScheduler(30000);
});

export default app;
