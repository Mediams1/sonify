import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "sonify-secret-key-12345";

// Database Setup
const db = new sqlite3.Database("sonify.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      is_verified INTEGER DEFAULT 0,
      taste_profile TEXT DEFAULT '{}'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT,
      artist TEXT,
      genre TEXT,
      release_date TEXT,
      duration INTEGER,
      preview_url TEXT,
      artwork_url TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER,
      song_id TEXT,
      FOREIGN KEY(playlist_id) REFERENCES playlists(id),
      FOREIGN KEY(song_id) REFERENCES songs(id)
    )
  `);
});

app.use(express.json());

// Seed Songs (Example Data)
const initialSongs = [
  // Reggaeton
  { id: "1", title: "Dakiti", artist: "Bad Bunny & Jhay Cortez", genre: "Reggaeton", release_date: "2020-10-30", duration: 205, preview_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview114/v4/37/2d/7d/372d7d8e-9c7a-9a8b-3b3b-8e1d5e5e5e5e/mzaf_1234567890123456789.plus.aac.p.m4a", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0c/3a/0c/0c3a0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c/192641068832.jpg/600x600bb.jpg" },
  { id: "2", title: "Provenza", artist: "Karol G", genre: "Reggaeton", release_date: "2022-04-21", duration: 210, preview_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/4e/6a/0a/4e6a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a/mzaf_0123456789012345678.plus.aac.p.m4a", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/4e/6a/0a/4e6a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a/22UMGIM39213.rgb.jpg/600x600bb.jpg" },
  { id: "3", title: "Gasolina", artist: "Daddy Yankee", genre: "Reggaeton", release_date: "2004-07-13", duration: 192, preview_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/0c/3a/0c/0c3a0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c/mzaf_0123456789012345678.plus.aac.p.m4a", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/0c/3a/0c/0c3a0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c/00602537042571.rgb.jpg/600x600bb.jpg" },
  // Salsa
  { id: "4", title: "Vivir Mi Vida", artist: "Marc Anthony", genre: "Salsa", release_date: "2013-04-26", duration: 252, preview_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/0c/3a/0c/0c3a0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c/mzaf_0123456789012345678.plus.aac.p.m4a", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/0c/3a/0c/0c3a0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c/00602537042571.rgb.jpg/600x600bb.jpg" },
  // ... (I will add more in the real implementation or fetch them dynamically)
];

// Note: In a real app, I'd use an external API like Apple Music/iTunes.
// For the demo, I'll provide a route to fetch songs from iTunes Search API.
app.get("/api/songs/search", async (req, res) => {
  const { term, genre } = req.query;
  try {
    const query = genre ? `${genre} music` : term;
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query as string)}&entity=song&limit=10&country=mx`);
    const data = await response.json();
    const songs = data.results.map((item: any) => ({
      id: String(item.trackId),
      title: item.trackName,
      artist: item.artistName,
      genre: item.primaryGenreName,
      release_date: item.releaseDate,
      duration: Math.floor(item.trackTimeMillis / 1000),
      preview_url: item.previewUrl,
      artwork_url: item.artworkUrl100.replace("100x100", "600x600"),
    }));
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: "Failed to search songs" });
  }
});

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username, email, hashedPassword],
    function(err) {
      if (err) return res.status(400).json({ error: "User already exists" });
      
      // Simulate email verification
      console.log(`[VERIFICATION EMAIL SENT TO ${email}] Click here: http://localhost:3000/verify?id=${this.lastID}`);
      
      const token = jwt.sign({ id: this.lastID }, JWT_SECRET);
      res.json({ token, user: { id: this.lastID, username, email, is_verified: 0 } });
    }
  );
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user: any) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_verified: user.is_verified } });
  });
});

app.get("/api/auth/verify/:id", (req, res) => {
  const { id } = req.params;
  db.run("UPDATE users SET is_verified = 1 WHERE id = ?", [id], (err) => {
    if (err) return res.status(400).json({ error: "Verification failed" });
    res.json({ message: "User verified" });
  });
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
