import { NextRequest, NextResponse } from 'next/server';
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
  if (!isAuthEnabled()) {
    return { ok: true as const, user: null };
  }

  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (adminIds.length > 0 && !adminIds.includes(user!.id)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: '无管理员权限' }, { status: 403 }),
    };
  }
  return { ok: true as const, user };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const tier = searchParams.get('tier') ?? '';

    let query = supabase
      .from('workspaces')
      .select('*, workspace_members!inner(count), subscriptions!left(plan_id, status, amount)')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: workspaces, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (workspaces ?? []).map((ws) => {
      const w = ws as Record<string, unknown>;
      const members = w['workspace_members'] as { count?: number }[];
      const subscriptions = w['subscriptions'] as { plan_id?: string; status?: string; amount?: number }[] | null;
      const sub = Array.isArray(subscriptions) ? subscriptions[0] : null;
      return {
        id: w.id as string,
        name: w.name as string,
        description: (w.description as string) ?? '',
        ownerId: w.owner_id as string,
        memberCount: members?.[0]?.count ?? 0,
        logoUrl: (w.logo_url as string) ?? null,
        subscriptionTier: sub?.plan_id ?? 'free',
        subscriptionStatus: sub?.status ?? 'inactive',
        subscriptionAmount: sub?.amount ?? 0,
        createdAt: w.created_at as string,
        updatedAt: w.updated_at as string,
      };
    });

    const filtered = tier ? mapped.filter((w) => w.subscriptionTier === tier) : mapped;

    return NextResponse.json({ workspaces: filtered });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取工作区列表失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { workspaceId, action, tier } = body as Record<string, unknown>;

    if (!workspaceId) {
      return NextResponse.json({ error: '缺少 workspaceId' }, { status: 400 });
    }

    if (action === 'suspend') {
      await supabase
        .from('workspaces')
        .update({ status: 'suspended' })
        .eq('id', workspaceId);
      return NextResponse.json({ ok: true, action: 'suspended' });
    }

    if (action === 'activate') {
      await supabase
        .from('workspaces')
        .update({ status: 'active' })
        .eq('id', workspaceId);
      return NextResponse.json({ ok: true, action: 'activated' });
    }

    if (action === 'delete') {
      await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId);
      await supabase.from('workspaces').delete().eq('id', workspaceId);
      return NextResponse.json({ ok: true, action: 'deleted' });
    }

    if (action === 'change-plan' && typeof tier === 'string') {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .single();

      if (existing) {
        await supabase
          .from('subscriptions')
          .update({ plan_id: tier })
          .eq('workspace_id', workspaceId);
      } else {
        await supabase.from('subscriptions').insert({
          workspace_id: workspaceId,
          plan_id: tier,
          status: 'active',
          amount: 0,
        });
      }
      return NextResponse.json({ ok: true, action: 'plan_changed', tier });
    }

    return NextResponse.json({ error: '无效 action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
