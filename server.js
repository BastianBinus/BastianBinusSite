const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const DATA_FILE = path.join(__dirname, "data", "notes.json");
const PUBLIC_DIR = __dirname; // statische Dateien direkt aus PortfolioWebsite

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// API: alle Notes lesen
app.get("/api/notes", (req, res) => {
  fs.readFile(DATA_FILE, "utf8", (err, data) => {
    if (err && err.code === "ENOENT") {
      return res.json([]);
    }
    if (err) {
      console.error("Error reading notes file:", err);
      return res.status(500).json({ error: "Failed to read notes file" });
    }
    try {
      const notes = JSON.parse(data || "[]");
      res.json(notes);
    } catch (parseErr) {
      console.error("Error parsing notes file:", parseErr);
      res.status(500).json({ error: "Failed to parse notes file" });
    }
  });
});

// API: Notes speichern (kompletter Array)
app.post("/api/notes", (req, res) => {
  const notes = req.body;

  if (!Array.isArray(notes)) {
    return res.status(400).json({ error: "Notes payload must be an array" });
  }

  fs.writeFile(DATA_FILE, JSON.stringify(notes, null, 2), "utf8", (err) => {
    if (err) {
      console.error("Error writing notes file:", err);
      return res.status(500).json({ error: "Failed to write notes file" });
    }
    res.json({ ok: true });
  });
});

// Root: auf bestehende Startseite leiten (index.html oder work.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
