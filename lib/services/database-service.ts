import * as SQLite from 'expo-sqlite';

export interface DatabasePost {
  id: string;
  title: string;
  content: string;
  html: string;
  imageUrl?: string;
  status: 'draft' | 'queued' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'retrying';
  retryCount: number;
  createdAt: string;
  publishAt?: string;
  lastError?: string;
  seoScore?: number;
  readabilityScore?: number;
  humanScore?: number;
  keywords?: string;
  tags?: string;
}

class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async init() {
    if (this.db) return;
    
    this.db = await SQLite.openDatabaseAsync('smartwriter.db');
    
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        html TEXT NOT NULL,
        imageUrl TEXT,
        status TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        publishAt TEXT,
        lastError TEXT,
        seoScore INTEGER,
        readabilityScore INTEGER,
        humanScore INTEGER,
        keywords TEXT,
        tags TEXT
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        data TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics (
        date TEXT PRIMARY KEY NOT NULL,
        publishedCount INTEGER DEFAULT 0,
        failedCount INTEGER DEFAULT 0,
        scheduledCount INTEGER DEFAULT 0
      );
    `);
  }

  async savePost(post: DatabasePost) {
    if (!this.db) await this.init();
    await this.db!.runAsync(
      `INSERT OR REPLACE INTO posts (id, title, content, html, imageUrl, status, retryCount, createdAt, publishAt, lastError, seoScore, readabilityScore, humanScore, keywords, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [post.id, post.title, post.content, post.html, post.imageUrl || null, post.status, post.retryCount, post.createdAt, post.publishAt || null, post.lastError || null, post.seoScore || null, post.readabilityScore || null, post.humanScore || null, post.keywords || null, post.tags || null]
    );
  }

  async getPosts(): Promise<DatabasePost[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllAsync<DatabasePost>('SELECT * FROM posts ORDER BY createdAt DESC');
  }

  async deletePost(id: string) {
    if (!this.db) await this.init();
    await this.db!.runAsync('DELETE FROM posts WHERE id = ?', [id]);
  }

  async saveLog(log: { id: string; level: string; message: string; context?: string; data?: any; timestamp: string }) {
    if (!this.db) await this.init();
    await this.db!.runAsync(
      'INSERT INTO logs (id, level, message, context, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [log.id, log.level, log.message, log.context || null, log.data ? JSON.stringify(log.data) : null, log.timestamp]
    );
  }

  async getLogs(limit: number = 100): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllAsync('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', [limit]);
  }
}

export const databaseService = DatabaseService.getInstance();
