const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(__dirname, "vampi.sqlite"));
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

let onlineUsers = 0;
io.on("connection", socket => {
  onlineUsers++;
  io.emit("online-count", onlineUsers);
  socket.on("disconnect", () => {
    onlineUsers = Math.max(0, onlineUsers - 1);
    io.emit("online-count", onlineUsers);
  });
});

const allowedExt = new Set([".glb", ".gltf", ".obj", ".stl", ".fbx"]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(allowedExt.has(ext) ? null : new Error("Formato no permitido. Usa GLB, GLTF, OBJ, STL o FBX."), allowedExt.has(ext));
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "online", service: "VAMPI AI STUDIO" }));
app.get("/api/status", (_req, res) => res.json({
  service: "FULL",
  aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  note: "Estado del servicio web; no representa el estado ni la seguridad de Free Fire."
}));

app.post("/api/upload", upload.single("model"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Selecciona un archivo 3D." });
  db.prepare("INSERT INTO uploads (filename, original_name, size, created_at) VALUES (?, ?, ?, ?)")
    .run(req.file.filename, req.file.originalname, req.file.size, new Date().toISOString());
  res.json({
    message: "Archivo recibido correctamente.",
    file: req.file.filename,
    size: req.file.size,
    downloadUrl: `/api/download/${encodeURIComponent(req.file.filename)}`
  });
});

app.get("/api/download/:name", (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(uploadDir, name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo no encontrado." });
  res.download(filePath);
});

app.post("/api/report", (req, res) => {
  const { type, message } = req.body || {};
  if (!["ban-report", "service-status", "bug"].includes(type) || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Completa el tipo y el mensaje." });
  }
  db.prepare("INSERT INTO reports (type, message, created_at) VALUES (?, ?, ?)")
    .run(type, message.trim().slice(0, 500), new Date().toISOString());
  res.json({ ok: true, message: "Reporte recibido y guardado." });
});

// OpenAI connection: the secret key stays on the server, never in browser JavaScript.
app.post("/api/assistant", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Escribe qué necesitas." });

  const lower = prompt.toLowerCase();
  const blocked = ["aimbot", "anti-ban", "antiban", "evadir anticheat", "hack", "cheat"];
  if (blocked.some(term => lower.includes(term))) {
    return res.status(400).json({
      error: "VAMPI AI ayuda con proyectos creativos, código general y herramientas 3D; no genera trampas, aimbots ni métodos para evadir sistemas antitrampas."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "La IA todavía no está conectada: falta configurar OPENAI_API_KEY en el archivo .env del servidor."
    });
  }

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "Eres VAMPI AI, un asistente en español para programación general, desarrollo web, diseño y manejo de modelos 3D. Sé claro y práctico. No ayudes a crear trampas, aimbots ni a evadir sistemas antitrampas.",
        input: prompt,
        max_output_tokens: 900
      })
    });
    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({ error: "El proveedor de IA rechazó la solicitud. Revisa la clave y la configuración del servidor." });
    }
    const answer = data.output
      ?.flatMap(item => item.content || [])
      ?.filter(part => part.type === "output_text")
      ?.map(part => part.text)
      ?.join("\n") || "No se recibió una respuesta de texto.";
    res.json({ answer });
  } catch (error) {
    console.error("AI request failed:", error);
    res.status(502).json({ error: "No se pudo conectar con el proveedor de IA." });
  }
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "No se pudo procesar la solicitud." });
});

server.listen(PORT, () => console.log(`VAMPI AI STUDIO activo en http://localhost:${PORT}`));
