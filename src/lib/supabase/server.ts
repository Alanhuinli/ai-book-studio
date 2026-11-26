import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from Server Component; Proxy refreshes sessions.
          }
        },
      },
    }
  );
}

/**
 * 專供正式金流（藍新 NewebPay / 綠界 ECPay）伺服器背景非同步 Webhook 核銷訂單使用。
 * 僅在伺服器環境變數配置 SUPABASE_SECRET_KEY 時啟用，絕不暴露至前端。
 */
export function createServiceAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  return createAdminSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
