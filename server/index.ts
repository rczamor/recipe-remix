import express from "express";
import session from "express-session";
import { join } from "path";
import { createServer } from "vite";
import routes from "./routes";

const app = express();
const PORT = process.env.PORT || 5000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "recipe-manager-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use(routes);

// Development mode: use Vite dev server
if (process.env.NODE_ENV !== "production") {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
    root: join(process.cwd(), "client")
  });
  
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
} else {
  // Production: serve static files
  app.use(express.static(join(process.cwd(), "dist/public")));
  
  app.get("*", (req, res) => {
    res.sendFile(join(process.cwd(), "dist/public/index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});