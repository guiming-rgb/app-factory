'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface Partner {
  id: string;
  name: string;
  type: string;
  email: string;
  website?: string;
  status: string;
  commissionRate: number;
  totalReferrals?: number;
  totalCommission?: number;
  createdAt: string;
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    name: string;
    action: 'activate' | 'suspend';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/enterprise/partners${params}`);
      if (!res.ok) {
        setPartners([]);
        return;
      }
      const data = await res.json();
      // The API returns an array directly
      setPartners(Array.isArray(data) ? data : data.partners ?? []);
    } catch (e) {
      console.error('Failed to fetch partners', e);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      await fetch('/api/enterprise/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: actionTarget.id,
          status: actionTarget.action === 'activate' ? 'active' : 'suspended',
        }),
      });
      setActionTarget(null);
      fetchPartners();
    } catch (e) {
      console.error('Action failed', e);
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Partner>[] = [
    {
      key: 'name',
      label: '名称',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-gray-900">{item.name}</span>
      ),
    },
    {
      key: 'type',
      label: '类型',
      render: (item) => <StatusBadge status={item.type} size="sm" />,
    },
    {
      key: 'email',
      label: '邮箱',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.email}</span>
      ),
    },
    {
      key: 'status',
      label: '状态',
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: 'commissionRate',
      label: '佣金比例',
      render: (item) => (
        <span className="text-sm text-gray-700">{item.commissionRate}%</span>
      ),
    },
    {
      key: 'totalReferrals',
      label: '推荐量',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-700">
          {item.totalReferrals ?? 0}
        </span>
      ),
    },
    {
      key: 'totalCommission',
      label: '累计佣金',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-700">
          ¥{(item.totalCommission ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: '加入时间',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-gray-500">
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.status === 'pending' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionTarget({ id: item.id, name: item.name, action: 'activate' });
              }}
              className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              批准
            </button>
          )}
          {(item.status === 'active' || item.status === 'pending') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionTarget({ id: item.id, name: item.name, action: 'suspend' });
              }}
              className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              {item.status === 'pending' ? '拒绝' : '暂停'}
            </button>
          )}
          {item.status === 'suspended' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionTarget({ id: item.id, name: item.name, action: 'activate' });
              }}
              className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              恢复
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-950">合作伙伴管理</h1>
        <p className="mt-1 text-sm text-gray-500">管理合作伙伴申请、佣金和推荐链接</p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        {(['all', 'active', 'pending', 'suspended'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-violet-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s === 'all'
              ? '全部'
              : s === 'active'
              ? '活跃'
              : s === 'pending'
              ? '待审核'
              : '已暂停'}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-4">
        <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          添加合作伙伴
        </button>
        <button className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          导出报表
        </button>
      </div>

      <DataTable
        columns={columns}
        data={partners}
        keyField="id"
        pageSize={15}
        loading={loading}
        emptyMessage={
          statusFilter === 'pending'
            ? '没有待审核的合作申请'
            : '暂无合作伙伴数据'
        }
      />

      <ConfirmModal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleAction}
        title={
          actionTarget?.action === 'activate'
            ? actionTarget?.name
              ? `批准 ${actionTarget.name}`
              : '批准合作伙伴'
            : '暂停合作伙伴'
        }
        message={
          actionTarget?.action === 'activate'
            ? `确定${actionTarget?.name && partners.find((p) => p.id === actionTarget.id)?.status === 'suspended' ? '恢复' : '批准'}该合作伙伴？`
            : `确定暂停 "${actionTarget?.name}"？暂停后推荐链接将失效。`
        }
        variant={actionTarget?.action === 'suspend' ? 'warning' : 'default'}
        loading={actionLoading}
        confirmText={actionTarget?.action === 'activate' ? '确认' : '确认暂停'}
      />
    </div>
  );
}
