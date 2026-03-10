import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  // Return existing connection instantly (hot path — no await)
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // --- Connection Pool (critical for free Atlas M0 — max 500 connections) ---
      maxPoolSize: 5,           // Max 5 sockets per serverless instance
      minPoolSize: 1,           // Keep 1 alive to reduce cold starts
      maxIdleTimeMS: 30_000,    // Close idle sockets after 30s

      // --- Timeouts ---
      serverSelectionTimeoutMS: 10_000,  // Wait up to 10s to find a server
      socketTimeoutMS: 30_000,           // Kill stuck queries after 30s
      connectTimeoutMS: 10_000,          // TCP connect timeout

      // --- Performance ---
      bufferCommands: true,     // Queue commands while connecting (prevents errors during cold start)
      autoIndex: false,         // Don't auto-create indexes in production (we do it manually)
      heartbeatFrequencyMS: 30_000, // Reduce monitoring traffic
    }).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    // Reset so next call retries instead of returning stale rejected promise
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
}

/**
 * Ensure required indexes exist. Call once on app startup or first request.
 * Idempotent — MongoDB skips creation if index already exists.
 */
let indexesEnsured = false;
export async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // Session indexes — most critical for performance
    const sessions = db.collection('sessions');
    await sessions.createIndex({ patient_id: 1 }, { background: true });
    await sessions.createIndex({ scan_time: -1 }, { background: true });
    await sessions.createIndex({ patient_id: 1, scan_time: -1 }, { background: true });

    // Patient indexes
    const patients = db.collection('patients');
    await patients.createIndex({ mobile: 1 }, { unique: true, background: true });
    await patients.createIndex({ status: 1 }, { background: true });

    indexesEnsured = true;
  } catch {
    // Non-fatal — indexes may already exist or permissions restricted
  }
}
