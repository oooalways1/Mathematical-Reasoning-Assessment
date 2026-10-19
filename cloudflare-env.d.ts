declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    TEACHER_PASSWORD?: string;
    TEACHER_EMAIL?: string;
    SESSION_SECRET?: string;
    FIREBASE_API_KEY?: string;
    FIREBASE_SERVICE_ACCOUNT_JSON?: string;
    AI?: {run(model:string,input:Record<string,unknown>):Promise<unknown>};
    AI_ENABLED?: string;
    AI_FREE_PLAN_CONFIRMED?: string;
  }
}
