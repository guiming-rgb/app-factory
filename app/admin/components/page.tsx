'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface Component {
  id: string;
  name: string;
  type: string;
  industry: string;
  author: string;
  approved: boolean;
  version: string;
  created_at: string;
  description?: string;
  tags?: string[];
}

export default function AdminComponentsPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    name: string;
    action: 'approve' | 'reject';
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/components?limit=100`);
      const data = await res.json();
      // The API returns approved components. For pending/rejected we need an admin endpoint.
      // For now, simulate by using the data we get + local state.
      setComponents(data.components ?? []);
    } catch (e) {
      console.error('Failed to fetch components', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Simulate pending components for moderation UI demo
  const displayComponents = components.map((c) => ({
    ...c,
    approved: statusFilter === 'all' ? c.approved :
              statusFilter === 'approved' ? true :
              statusFilter === 'rejected' ? false :
              statusFilter === 'pending' ? !c.approved : c.approved,
  }));

  const filtered =
    statusFilter === 'all'
      ? displayComponents
      : statusFilter === 'approved'
      ? displayComponents.filter((c) => c.approved)
      : statusFilter === 'rejected'
      ? displayComponents.filter((c) => !c.approved)
      : displayComponents;

  const handleApproveReject = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      await fetch(`/api/marketplace/components/${actionTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: actionTarget.action === 'approve',
          ...(actionTarget.action === 'reject' && rejectReason
            ? { rejection_reason: rejectReason }
            : {}),
        }),
      });
      setActionTarget(null);
      setRejectReason('');
      fetchComponents();
    } catch (e) {
      console.error('Action failed', e);
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Component>[] = [
    {
      key: 'name',
      label: '组件名称',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-gray-900">{item.name}</span>
      ),
    },
    {
      key: 'type',
      label: '类型',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.type}</span>
      ),
    },
    {
      key: 'industry',
      label: '行业',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.industry}</span>
      ),
    },
    {
      key: 'author',
      label: '作者',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.author}</span>
      ),
    },
    {
      key: 'version',
      label: '版本',
      render: (item) => (
        <span className="text-sm text-gray-500">{item.version}</span>
      ),
    },
    {
      key: 'approved',
      label: '状态',
      render: (item) => (
        <StatusBadge
          status={item.approved ? 'approved' : 'pending'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      label: '审核',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionTarget({ id: item.id, name: item.name, action: 'approve' });
            }}
            className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            批准
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionTarget({ id: item.id, name: item.name, action: 'reject' });
            }}
            className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            拒绝
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-950">组件审核</h1>
        <p className="mt-1 text-sm text-gray-500">审核和管理组件市场提交</p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-violet-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? '全部' : s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        pageSize={15}
        loading={loading}
        emptyMessage={
          statusFilter === 'pending'
            ? '没有待审核的组件'
            : '暂无组件数据'
        }
      />

      {actionTarget && (
        <ConfirmModal
          open={!!actionTarget}
          onClose={() => {
            setActionTarget(null);
            setRejectReason('');
          }}
          onConfirm={handleApproveReject}
          title={
            actionTarget.action === 'approve' ? '批准组件' : '拒绝组件'
          }
          message={
            actionTarget.action === 'approve'
              ? `确定批准组件 "${actionTarget.name}" 上架市场？`
              : `确定拒绝组件 "${actionTarget.name}"？`
          }
          variant={actionTarget.action === 'approve' ? 'default' : 'danger'}
          loading={actionLoading}
          confirmText={actionTarget.action === 'approve' ? '确认批准' : '确认拒绝'}
        >
          {actionTarget.action === 'reject' && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                拒绝原因（可选）
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请说明拒绝原因…"
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}
