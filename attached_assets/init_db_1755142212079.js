// init_db.js
import Database from 'better-sqlite3';
import fs from 'fs';

const DB_FILE = 'cipherbox.db';
const db = new Database(DB_FILE);

db.exec(`
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail TEXT,
  duration INTEGER,
  download_url TEXT,
  size INTEGER,
  scraped_at DATETIME,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_videos_url ON videos(url);
CREATE INDEX IF NOT EXISTS idx_videos_scraped_at ON videos(scraped_at);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY(video_id) REFERENCES videos(id)
);
CREATE INDEX IF NOT EXISTS idx_tags_video_id ON tags(video_id);
`);

console.log('Database initialized or already up-to-date:', DB_FILE);
db.close();
