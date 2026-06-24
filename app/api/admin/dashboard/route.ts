import { NextResponse } from 'next/server';
import { getApiUser, unauthorizedResponse } from '@/lib/auth/api-user';
import { isAuthEnabled } from '@/lib/auth-config';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const user = await getApiUser();
  if (isAuthEnabled() && !user) {
    return { ok: false as const, response: unauthorizedResponse() };
  }

  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (adminIds.length > 0 && user && !adminIds.includes(user.id)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: '无管理员权限' }, { status: 403 }),
    };
  }
  return { ok: true as const, user };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseAdmin();

    // Run queries in parallel
    const [
      { count: workspaceCount },
      { count: projectCount },
      { count: codegenCount },
      { count: userQuotaCount },
      { data: subscriptions },
      { data: recentCodegen },
    ] = await Promise.all([
      supabase.from('workspaces').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('codegen_runs').select('*', { count: 'exact', head: true }),
      supabase.from('user_quotas').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*').eq('status', 'active'),
      supabase
        .from('codegen_runs')
        .select('id, project_id, target, status, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Calculate revenue from subscriptions
    const mrr = (subscriptions ?? []).reduce((sum, sub) => {
      const amount = (sub as Record<string, unknown>).amount ?? 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);

    // Format recent activity
    const recentActivity = (recentCodegen ?? []).map((run) => {
      const r = run as Record<string, unknown>;
      return {
        id: r.id as string,
        projectId: r.project_id as string,
        target: r.target as string,
        status: r.status as string,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      };
    });

    return NextResponse.json({
      stats: {
        workspaces: workspaceCount ?? 0,
        activeUsers: userQuotaCount ?? 0,
        projects: projectCount ?? 0,
        codegenRuns: codegenCount ?? 0,
        activeSubscriptions: subscriptions?.length ?? 0,
        mrr,
      },
      recentActivity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取数据失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
