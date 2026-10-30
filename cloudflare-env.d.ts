declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    INSTAGRAM_APP_ID?: string;
    SHARPSPORTS_PRIVATE_KEY?: string;
    BETPLACE_LIVE_ENABLED?: string;
    BUCKET?: R2Bucket;
  }
}
