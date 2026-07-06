import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failOnSupabaseError(label: string, error: { message: string } | null) {
  if (!error) return null;
  console.error(`[admin/dashboard] ${label}:`, error.message);
  return NextResponse.json({ error: `${label} 查询失败` }, { status: 500 });
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseAdmin();

    const [
      workspacesRes,
      projectsRes,
      codegenRes,
      userQuotasRes,
      subscriptionsRes,
      recentCodegenRes,
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

    for (const [label, res] of [
      ['workspaces', workspacesRes],
      ['projects', projectsRes],
      ['codegen_runs', codegenRes],
      ['user_quotas', userQuotasRes],
      ['subscriptions', subscriptionsRes],
      ['recent_codegen', recentCodegenRes],
    ] as const) {
      const errResp = failOnSupabaseError(label, res.error);
      if (errResp) return errResp;
    }

    const subscriptions = subscriptionsRes.data;
    const recentCodegen = recentCodegenRes.data;

    const mrr = (subscriptions ?? []).reduce((sum, sub) => {
      const amount = (sub as Record<string, unknown>).amount ?? 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);

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
        workspaces: workspacesRes.count ?? 0,
        activeUsers: userQuotasRes.count ?? 0,
        projects: projectsRes.count ?? 0,
        codegenRuns: codegenRes.count ?? 0,
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
