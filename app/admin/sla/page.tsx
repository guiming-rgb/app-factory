'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatsCard } from '@/components/ui/stats-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface UptimeStatus {
  current: string;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  incidents?: Incident[];
}

interface Incident {
  id: string;
  workspaceId: string;
  type: string;
  status: string;
  description?: string;
  startedAt: string;
  resolvedAt?: string;
}

interface IncidentForm {
  type: 'outage' | 'degraded' | 'maintenance';
  description: string;
}

export default function AdminSLAPage() {
  const [uptime, setUptime] = useState<UptimeStatus | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState<IncidentForm>({
    type: 'degraded',
    description: '',
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uptimeRes, incidentRes] = await Promise.all([
        fetch('/api/enterprise/sla?global=true'),
        fetch('/api/enterprise/sla?global=true&incidents=true').catch(() => null),
      ]);

      if (uptimeRes.ok) {
        const data = await uptimeRes.json();
        setUptime(data);
      }

      if (incidentRes && incidentRes.ok) {
        const data = await incidentRes.json();
        setIncidents(data.incidents ?? []);
      } else {
        setIncidents([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/enterprise/sla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          type: reportForm.type,
          description: reportForm.description,
          workspaceId: 'global',
        }),
      });
      if (res.ok) {
        setShowReport(false);
        setReportForm({ type: 'degraded', description: '' });
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setReportLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; class: string }> = {
    operational: { label: '运行正常', class: 'text-emerald-600' },
    degraded: { label: '部分降级', class: 'text-amber-600' },
    outage: { label: '服务中断', class: 'text-red-600' },
    maintenance: { label: '维护中', class: 'text-blue-600' },
  };

  const currentStatus = uptime?.current ?? 'operational';
  const statusInfo = statusConfig[currentStatus] ?? statusConfig.operational;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-950">SLA 监控</h1>
        <p className="mt-1 text-sm text-gray-500">平台服务等级协议监控与事件管理</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {/* Status banner */}
      <div
        className={`mb-8 rounded-2xl border p-6 ${
          currentStatus === 'operational'
            ? 'border-emerald-200 bg-emerald-50'
            : currentStatus === 'degraded'
            ? 'border-amber-200 bg-amber-50'
            : currentStatus === 'outage'
            ? 'border-red-200 bg-red-50'
            : 'border-blue-200 bg-blue-50'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-4 w-4 rounded-full ${
                currentStatus === 'operational'
                  ? 'bg-emerald-500'
                  : currentStatus === 'degraded'
                  ? 'bg-amber-500'
                  : currentStatus === 'outage'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
            />
            <div>
              <p className={`text-lg font-bold ${statusInfo.class}`}>
                系统 {statusInfo.label}
              </p>
              <p className="text-sm text-gray-500">
                最后更新于 {new Date().toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            报告事件
          </button>
        </div>
      </div>

      {/* Uptime cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatsCard
          title="24 小时可用率"
          value={`${(uptime?.uptime24h ?? 100).toFixed(2)}%`}
          loading={loading}
          trend={
            uptime && uptime.uptime24h < 99.9
              ? { value: Number((100 - uptime.uptime24h).toFixed(2)), positive: false }
              : undefined
          }
        />
        <StatsCard
          title="7 天可用率"
          value={`${(uptime?.uptime7d ?? 100).toFixed(2)}%`}
          loading={loading}
        />
        <StatsCard
          title="30 天可用率"
          value={`${(uptime?.uptime30d ?? 100).toFixed(2)}%`}
          loading={loading}
        />
      </div>

      {/* Active incidents */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-950">
          活跃事件 ({incidents.filter((i) => i.status === 'open').length})
        </h2>
        {incidents.filter((i) => i.status === 'open').length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
            当前无活跃事件
          </div>
        ) : (
          <div className="space-y-3">
            {incidents
              .filter((i) => i.status === 'open')
              .map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={inc.type} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {inc.description || `${inc.type} 事件`}
                        </p>
                        <p className="text-xs text-gray-400">
                          开始于{' '}
                          {new Date(inc.startedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Incident history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-950">
          事件历史
        </h2>
        {incidents.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
            暂无事件记录
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-50">
            {incidents.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={inc.type} size="sm" />
                  <div>
                    <p className="text-sm text-gray-900">
                      {inc.description || `${inc.type} 事件`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(inc.startedAt).toLocaleString('zh-CN')}
                      {inc.resolvedAt &&
                        ` · 已解决 (${formatDuration(
                          new Date(inc.resolvedAt).getTime() -
                            new Date(inc.startedAt).getTime()
                        )})`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={inc.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report incident modal */}
      <ConfirmModal
        open={showReport}
        onClose={() => setShowReport(false)}
        onConfirm={handleReport}
        title="报告事件"
        message="请填写事件详情"
        variant="warning"
        loading={reportLoading}
        confirmText="提交报告"
      >
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              事件类型
            </label>
            <select
              value={reportForm.type}
              onChange={(e) =>
                setReportForm((f) => ({
                  ...f,
                  type: e.target.value as IncidentForm['type'],
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
            >
              <option value="degraded">部分降级</option>
              <option value="outage">服务中断</option>
              <option value="maintenance">维护</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              事件描述
            </label>
            <textarea
              value={reportForm.description}
              onChange={(e) =>
                setReportForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="描述事件详情…"
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours} 小时 ${remMin} 分钟` : `${hours} 小时`;
}
