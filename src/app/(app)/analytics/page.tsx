'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, BarChart3, Clock, Eye, RefreshCw, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, errorMessage } from '@/lib/api';
import { EmptyState, Notice, PageHeader, Skeleton } from '@/components/ui';
import Select from '@/components/Select';

const RANGES = [['7days', 'Last 7 days'], ['30days', 'Last 30 days'], ['90days', 'Last 90 days'], ['all', 'All time']];
const SERIES = ['var(--accent)', 'color-mix(in srgb, var(--accent) 65%, var(--fg))', 'color-mix(in srgb, var(--accent) 40%, var(--muted))', 'var(--muted)', 'color-mix(in srgb, var(--muted) 55%, var(--bg))', 'var(--line)'];
const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 13, color: 'var(--fg)' }, cursor: { stroke: 'var(--line)', fill: 'var(--surface-2)' } };

function Metric({ icon: Icon, label, value, change }: { icon: any; label: string; value: string | number; change?: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-muted"><span className="text-[13px]">{label}</span><Icon size={16} strokeWidth={1.6} /></div>
      <p className="mt-3 text-[28px] font-bold leading-none tracking-tight text-fg">{value}</p>
      {change != null && change !== 0 && (
        <p className={`mt-2 inline-flex items-center gap-1 text-xs ${change > 0 ? 'text-success' : 'text-danger'}`}>
          {change > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{change > 0 ? '+' : ''}{change}%
        </p>
      )}
    </div>
  );
}

const Panel = ({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) => (
  <section className={`card p-6 ${wide ? 'lg:col-span-2' : ''}`}><h2 className="mb-5 text-[15px] font-semibold text-fg">{title}</h2>{children}</section>
);

export default function AnalyticsPage() {
  const [range, setRange] = useState('7days');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData((await api.get(`/admin/analytics?range=${range}`)).data); }
    catch (e) { setError(errorMessage(e, 'Failed to load analytics.')); setData(null); }
    finally { setLoading(false); }
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const head = (
    <PageHeader icon={BarChart3} title="Analytics" description="How the journal is being read.">
      <Select ariaLabel="Range" className="!w-40" value={range} onChange={setRange} options={RANGES.map(([value, label]) => ({ value, label }))} />
      <button className="btn-ghost btn-icon" onClick={load} aria-label="Refresh"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
    </PageHeader>
  );

  if (loading && !data) return <>{head}<Skeleton rows={6} /></>;
  if (!data) return <>{head}{error && <Notice>{error}</Notice>}<EmptyState icon={BarChart3} title="No analytics yet">Data appears once visitors start reading.</EmptyState></>;

  return (
    <>
      {head}
      {error && <Notice>{error}</Notice>}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={Eye} label="Total views" value={data.totalViews?.toLocaleString() || 0} change={data.viewsChange} />
        <Metric icon={Users} label="Unique visitors" value={data.totalVisitors?.toLocaleString() || 0} change={data.visitorsChange} />
        <Metric icon={Clock} label="Avg. time on page" value={data.avgTimeOnPage || '0:00'} />
        <Metric icon={Activity} label="Bounce rate" value={`${data.bounceRate || 0}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Views over time" wide>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.viewsOverTime || []}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={36} />
              <Tooltip {...tip} /><Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top posts">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.topPosts || []} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="title" width={120} tickLine={false} axisLine={false} tickFormatter={(t: string) => (t?.length > 16 ? `${t.slice(0, 15)}…` : t)} />
              <Tooltip {...tip} /><Bar dataKey="views" fill="var(--accent)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Traffic sources">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart><Pie data={data.trafficSources || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} stroke="var(--surface)" strokeWidth={2}>
                {(data.trafficSources || []).map((_: any, i: number) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              </Pie><Tooltip {...tip} /></PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-2 text-[13px] sm:w-44">
              {(data.trafficSources || []).map((s: any, i: number) => (
                <li key={s.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-body"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />{s.name}</span><span className="font-mono text-xs text-muted">{s.value}</span></li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      {(data.popularPosts || []).length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <h2 className="px-5 pb-3 pt-5 text-[15px] font-semibold text-fg">Most popular posts</h2>
          <table className="w-full text-[14px]">
            <thead className="border-y border-line"><tr><th className="th w-14">#</th><th className="th">Post</th><th className="th text-right">Views</th><th className="th hidden text-right sm:table-cell">Avg. time</th><th className="th hidden text-right sm:table-cell">Shares</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.popularPosts.map((p: any, i: number) => (
                <tr key={p.id}><td className="td font-mono text-xs text-muted">{i + 1}</td><td className="td font-medium text-fg">{p.title}</td><td className="td text-right">{p.views?.toLocaleString() || 0}</td><td className="td hidden text-right text-muted sm:table-cell">{p.avgTime || '0:00'}</td><td className="td hidden text-right text-muted sm:table-cell">{p.shares || 0}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="mt-8 text-[13px] text-muted">For full reports, open <a className="text-accent underline underline-offset-4" href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">Google Analytics</a>.</p>
    </>
  );
}
