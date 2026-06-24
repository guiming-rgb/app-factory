'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberCount: number;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionAmount: number;
  createdAt: string;
}

function useAdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tierFilter) params.set('tier', tierFilter);
      const res = await fetch(`/api/admin/workspaces-all?${params}`);
      const data = await res.json();
      setWorkspaces(data.workspaces ?? []);
    } catch (e) {
      console.error('Failed to fetch workspaces', e);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const performAction = async (
    workspaceId: string,
    action: string,
    tier?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/workspaces-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, action, tier }),
      });
      if (!res.ok) return false;
      await fetchWorkspaces();
      return true;
    } catch {
      return false;
    }
  };

  return { workspaces, loading, search, setSearch, tierFilter, setTierFilter, performAction, fetchWorkspaces };
}

export default function AdminWorkspacesPage() {
  const { workspaces, loading, search, setSearch, tierFilter, setTierFilter, performAction } =
    useAdminWorkspaces();
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    name: string;
    action: 'suspend' | 'delete' | 'change-plan';
    tier?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const columns: Column<Workspace>[] = [
    {
      key: 'name',
      label: '名称',
      sortable: true,
      render: (item) => (
        <Link
          href={`/admin/workspaces/${item.id}`}
          className="font-medium text-violet-700 hover:underline"
        >
          {item.name}
        </Link>
      ),
    },
    {
      key: 'memberCount',
      label: '成员',
      sortable: true,
      width: 'w-20',
      render: (item) => (
        <span className="text-gray-700">{item.memberCount}</span>
      ),
    },
    {
      key: 'subscriptionTier',
      label: '订阅',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={item.subscriptionTier} size="sm" />
          {item.subscriptionAmount > 0 && (
            <span className="text-xs text-gray-400">
              ¥{item.subscriptionAmount.toLocaleString()}/月
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'subscriptionStatus',
      label: '状态',
      render: (item) => <StatusBadge status={item.subscriptionStatus} size="sm" />,
    },
    {
      key: 'createdAt',
      label: '创建时间',
      sortable: true,
      render: (item) => (
        <span className="text-gray-600">
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      render: (item) => (
        <div className="flex items-center gap-2">
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (!val) return;
              if (val === 'change-free') {
                setConfirmAction({ id: item.id, name: item.name, action: 'change-plan', tier: 'free' });
              } else if (val === 'change-pro') {
                setConfirmAction({ id: item.id, name: item.name, action: 'change-plan', tier: 'pro' });
              } else if (val === 'change-enterprise') {
                setConfirmAction({ id: item.id, name: item.name, action: 'change-plan', tier: 'enterprise' });
              } else if (val === 'suspend') {
                setConfirmAction({ id: item.id, name: item.name, action: 'suspend' });
              } else if (val === 'delete') {
                setConfirmAction({ id: item.id, name: item.name, action: 'delete' });
              }
            }}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 outline-none focus:border-violet-500"
          >
            <option value="">操作</option>
            <option value="change-free">降级 Free</option>
            <option value="change-pro">升级 Pro</option>
            <option value="change-enterprise">升级 Enterprise</option>
            <option value="suspend">暂停</option>
            <option value="delete">删除</option>
          </select>
        </div>
      ),
    },
  ];

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    await performAction(
      confirmAction.id,
      confirmAction.action === 'change-plan' ? 'change-plan' : confirmAction.action,
      confirmAction.action === 'change-plan' ? confirmAction.tier : undefined
    );
    setActionLoading(false);
    setConfirmAction(null);
  };

  const getConfirmMessage = () => {
    if (!confirmAction) return '';
    switch (confirmAction.action) {
      case 'suspend':
        return `确定暂停工作区 "${confirmAction.name}"？暂停后成员将无法访问。`;
      case 'delete':
        return `确定删除工作区 "${confirmAction.name}"？此操作不可恢复，所有项目和数据将被永久删除。`;
      case 'change-plan':
        return `确定将工作区 "${confirmAction.name}" 的订阅改为 ${confirmAction.tier} 方案？`;
      default:
        return '';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-950">工作区管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理所有工作区、订阅和团队
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索工作区名称…"
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-violet-500"
        >
          <option value="">全部方案</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={workspaces}
        keyField="id"
        pageSize={15}
        loading={loading}
        emptyMessage="暂无工作区"
      />

      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={
          confirmAction?.action === 'delete'
            ? '删除工作区'
            : confirmAction?.action === 'suspend'
            ? '暂停工作区'
            : '变更订阅方案'
        }
        message={getConfirmMessage()}
        variant={confirmAction?.action === 'delete' ? 'danger' : 'warning'}
        loading={actionLoading}
        confirmText={
          confirmAction?.action === 'delete'
            ? '确认删除'
            : confirmAction?.action === 'suspend'
            ? '确认暂停'
            : '确认变更'
        }
      />
    </div>
  );
}
