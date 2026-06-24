'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatsCard } from '@/components/ui/stats-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable, type Column } from '@/components/ui/data-table';

interface Subscription {
  id: string;
  workspace_id?: string;
  plan_id: string;
  status: string;
  amount: number;
  currency?: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
  workspace_name?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  tier: string;
  price: number;
  limits: Record<string, number>;
  features: string[];
}

export default function AdminBillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch('/api/admin?type=subscriptions'),
        fetch('/api/billing/plans'),
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscriptions(data.subscriptions ?? []);
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans ?? []);
      }
    } catch (e) {
      console.error('Failed to load billing data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSubs =
    activeFilter === 'all'
      ? subscriptions
      : subscriptions.filter((s) => s.status === activeFilter);

  // Calculate revenue stats
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const totalMRR = activeSubs.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const totalARR = totalMRR * 12;

  const churnRate =
    subscriptions.length > 0
      ? (
          (subscriptions.filter(
            (s) => s.status === 'cancelled' || s.status === 'incomplete'
          ).length /
            subscriptions.length) *
          100
        ).toFixed(1)
      : '0.0';

  const columns: Column<Subscription>[] = [
    {
      key: 'workspace_id',
      label: '工作区',
      render: (item) => (
        <span className="text-sm font-medium text-gray-900">
          {item.workspace_name ?? item.workspace_id?.slice(0, 8) ?? '-'}
        </span>
      ),
    },
    {
      key: 'plan_id',
      label: '方案',
      render: (item) => <StatusBadge status={item.plan_id} size="sm" />,
    },
    {
      key: 'amount',
      label: '金额/月',
      sortable: true,
      render: (item) => (
        <span className="text-sm font-medium text-gray-900">
          ¥{(item.amount ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: '状态',
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: 'created_at',
      label: '创建时间',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-gray-500">
          {new Date(item.created_at).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-950">计费管理</h1>
        <p className="mt-1 text-sm text-gray-500">营收概览、订阅管理和定价方案</p>
      </div>

      {/* Revenue cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="月经常性收入 (MRR)"
          value={`¥${totalMRR.toLocaleString()}`}
          loading={loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="年经常性收入 (ARR)"
          value={`¥${totalARR.toLocaleString()}`}
          loading={loading}
        />
        <StatsCard
          title="活跃订阅"
          value={activeSubs.length}
          loading={loading}
        />
        <StatsCard
          title="流失率"
          value={`${churnRate}%`}
          loading={loading}
          trend={
            parseFloat(churnRate) > 5
              ? { value: parseFloat(churnRate), positive: false }
              : undefined
          }
        />
      </div>

      {/* Pricing Plans */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-950">定价方案</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.length === 0 && !loading ? (
            <div className="col-span-3 rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
              暂无定价方案数据
            </div>
          ) : loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-gray-100"
              />
            ))
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 ${
                  plan.tier === 'pro'
                    ? 'border-violet-200 bg-violet-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <h3 className="text-lg font-bold text-gray-950">{plan.name}</h3>
                <p className="mt-1 text-3xl font-bold text-gray-950">
                  ¥{plan.price}
                  <span className="text-base font-normal text-gray-400">
                    /月
                  </span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subscriptions table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-950">
            订阅列表 ({subscriptions.length})
          </h2>
          <div className="flex items-center gap-2">
            {(['all', 'active', 'trialing', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === s
                    ? 'bg-violet-600 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? '全部' : s === 'active' ? '活跃' : s === 'trialing' ? '试用' : '已取消'}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredSubs}
          keyField="id"
          pageSize={10}
          loading={loading}
          emptyMessage="暂无订阅数据"
        />
      </div>
    </div>
  );
}
