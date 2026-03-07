import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VFS_ROOT = path.join(__dirname, "alpha_files");

// Ensure VFS root exists
if (!fs.existsSync(VFS_ROOT)) {
  fs.mkdirSync(VFS_ROOT);
}

const db = new Database("alpha_memory.db");

// Initialize Memory Table
db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT,
    messages TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // --- API Routes ---

  // Memory API
  app.get("/api/chats", (req, res) => {
    const chats = db.prepare("SELECT * FROM chats ORDER BY updated_at DESC").all();
    res.json(chats);
  });

  app.post("/api/chats", (req, res) => {
    const { id, title, messages } = req.body;
    db.prepare("INSERT OR REPLACE INTO chats (id, title, messages, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)")
      .run(id, title, JSON.stringify(messages));
    res.json({ success: true });
  });

  app.delete("/api/chats/:id", (req, res) => {
    db.prepare("DELETE FROM chats WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // VFS (Virtual File System) API
  app.get("/api/files", (req, res) => {
    try {
      const files = fs.readdirSync(VFS_ROOT).map(name => {
        const stats = fs.statSync(path.join(VFS_ROOT, name));
        return { name, isDirectory: stats.isDirectory(), size: stats.size, mtime: stats.mtime };
      });
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/files/write", (req, res) => {
    const { name, content } = req.body;
    try {
      fs.writeFileSync(path.join(VFS_ROOT, name), content);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/files/mkdir", (req, res) => {
    const { name } = req.body;
    try {
      fs.mkdirSync(path.join(VFS_ROOT, name), { recursive: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/files/:name", (req, res) => {
    try {
      const target = path.join(VFS_ROOT, req.params.name);
      if (fs.statSync(target).isDirectory()) {
        fs.rmSync(target, { recursive: true });
      } else {
        fs.unlinkSync(target);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Alpha Server online at http://localhost:${PORT}`);
  });
}

startServer();
