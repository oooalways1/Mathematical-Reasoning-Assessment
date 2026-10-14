declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    TEACHER_PASSWORD?: string;
    TEACHER_EMAIL?: string;
    SESSION_SECRET?: string;
    FIREBASE_API_KEY?: string;
  }
}

