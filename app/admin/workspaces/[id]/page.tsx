'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatsCard } from '@/components/ui/stats-card';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface WorkspaceDetail {
  workspace: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
  };
  members: {
    id: string;
    user_id: string;
    role: string;
    email?: string;
    created_at: string;
  }[];
}

export default function AdminWorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [codegenRuns, setCodegenRuns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      if (!res.ok) throw new Error('工作区不存在');
      const data = await res.json();
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    fetch(`/api/admin/dashboard`)
      .then((r) => r.json())
      .then((data) => {
        setCodegenRuns(data.recentActivity ?? []);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div>
        <Link
          href="/admin/workspaces"
          className="mb-4 inline-flex items-center text-sm text-violet-600 hover:text-violet-700"
        >
          ← 返回工作区列表
        </Link>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || '工作区不存在'}
        </div>
      </div>
    );
  }

  const ws = detail.workspace;
  const members = detail.members;

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await fetch(`/api/admin/workspaces-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, action: 'delete' }),
      });
      window.location.href = '/admin/workspaces';
    } catch {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <Link
        href="/admin/workspaces"
        className="mb-4 inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        返回工作区列表
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">{ws.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {ws.description || '暂无描述'} · 创建于{' '}
            {new Date(ws.created_at).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          删除工作区
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatsCard title="成员数" value={members.length} />
        <StatsCard title="项目数" value="-" subtitle="待集成" />
        <StatsCard title="ID" value={ws.id.slice(0, 8) + '…'} subtitle={ws.id} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Members */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-950">
              成员列表 ({members.length})
            </h2>
          </div>
          {members.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-400">暂无成员</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-blue-400 text-xs font-bold text-white">
                      {(m.email ?? '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {m.email ?? `用户 ${m.user_id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        加入于 {new Date(m.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={m.role} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent codegen runs */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-950">最近生成</h2>
          </div>
          {codegenRuns.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-400">暂无生成记录</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {codegenRuns.slice(0, 10).map((run) => {
                const r = run as Record<string, unknown>;
                return (
                  <div key={r.id as string} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {(r.target as string) ?? 'unknown'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {r.createdAt
                          ? new Date(r.createdAt as string).toLocaleDateString('zh-CN')
                          : ''}
                      </p>
                    </div>
                    <StatusBadge status={(r.status as string) ?? 'unknown'} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="删除工作区"
        message={`确定删除工作区 "${ws.name}"？所有项目和数据将被永久删除，此操作不可恢复。`}
        variant="danger"
        loading={deleteLoading}
        confirmText="确认永久删除"
      />
    </div>
  );
}
