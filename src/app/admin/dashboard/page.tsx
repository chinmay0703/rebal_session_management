'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, Badge, Skeleton, SearchInput, Button, Modal } from '@/components/ui/components';
import {
  Users, Package, CalendarCheck, Clock, ScanLine,
  AlertTriangle, Timer, CheckCircle2, XCircle, MessageCircle,
  UserX, RefreshCw, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FeedItem {
  _id: string;
  patient_name: string;
  patient_mobile: string;
  session_number: number;
  time: string;
}

interface AlertItem {
  _id: string;
  name: string;
  mobile: string;
  package_name: string;
  sessions_remaining?: number;
  days_left?: number;
  days_since?: number;
}

interface DashboardData {
  total_patients: number;
  total_packages: number;
  sessions_today: number;
  total_sessions_pending: number;
  total_scans_today: number;
  active_patients: number;
  completed_patients: number;
  expired_patients: number;
  completing_soon: AlertItem[];
  expiring_soon: AlertItem[];
  no_show: AlertItem[];
  today_feed: FeedItem[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ _id: string; name: string; mobile: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [origin, setOrigin] = useState('');

  // Quick session
  const [quickSessionOpen, setQuickSessionOpen] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [activePatients, setActivePatients] = useState<Array<{ _id: string; name: string; mobile: string; pending_sessions: number; completed_sessions: number; total_sessions: number; package_name: string }>>([]);
  const [activePatientsLoading, setActivePatientsLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [quickResult, setQuickResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const d = await res.json();
      setData(d);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); setOrigin(window.location.origin); }, [loadDashboard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => loadDashboard(true), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Quick patient search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch('/api/patients')
        .then((r) => r.json())
        .then((patients) => {
          const filtered = patients.filter((p: { name: string; mobile: string }) =>
            p.name.toLowerCase().includes(search.toLowerCase()) || p.mobile.includes(search)
          ).slice(0, 5);
          setSearchResults(filtered);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Load active patients for quick session
  const loadActivePatients = async () => {
    setActivePatientsLoading(true);
    try {
      const res = await fetch('/api/patients?stats=true');
      if (res.ok) {
        const all = await res.json();
        const active = all
          .filter((p: { status: string; pending_sessions: number }) => p.status === 'active' && p.pending_sessions > 0)
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        setActivePatients(active);
      }
    } catch { /* ignore */ }
    setActivePatientsLoading(false);
  };

  const openQuickSession = () => {
    setQuickSessionOpen(true);
    setSelectedPatientId('');
    setQuickResult(null);
    loadActivePatients();
  };

  // Quick session recording
  const handleQuickSession = async () => {
    if (!selectedPatientId) { toast.error('Select a patient'); return; }
    setQuickLoading(true);
    setQuickResult(null);
    try {
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        setQuickResult({ type: 'error', message: sessionData.error });
        return;
      }

      setQuickResult({ type: 'success', message: `Session #${sessionData.sessions_completed} recorded for ${sessionData.patient_name}` });
      toast.success(`Session #${sessionData.sessions_completed} recorded for ${sessionData.patient_name}`);
      setSelectedPatientId('');
      loadActivePatients();
      loadDashboard(true);
    } catch {
      setQuickResult({ type: 'error', message: 'Failed to record session' });
    } finally {
      setQuickLoading(false);
    }
  };

  const stats = data
    ? [
        { label: 'Total Patients', value: data.total_patients, icon: Users, color: 'from-brand-500 to-brand-700', text: 'text-brand-600' },
        { label: 'Active', value: data.active_patients, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-700', text: 'text-emerald-600' },
        { label: 'Sessions Today', value: data.sessions_today, icon: CalendarCheck, color: 'from-accent-sky to-blue-700', text: 'text-accent-sky' },
        { label: 'Pending', value: data.total_sessions_pending, icon: Clock, color: 'from-accent-amber to-orange-600', text: 'text-accent-amber' },
        { label: 'Completed', value: data.completed_patients, icon: Package, color: 'from-accent-violet to-purple-700', text: 'text-accent-violet' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-surface-400 mt-1">Clinic overview at a glance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => loadDashboard(true)}
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}>
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" onClick={openQuickSession}
            icon={<Zap className="w-4 h-4" />}>
            <span className="hidden sm:inline">Quick Session</span>
          </Button>
        </div>
      </div>

      {/* Quick Patient Search */}
      <div className="relative">
        <SearchInput value={search} onChange={setSearch} placeholder="Quick search patient by name or mobile..." />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {searchResults.map((p) => (
              <Link key={p._id} href={`/admin/patients/${p._id}`} onClick={() => setSearch('')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
                  <span className="text-brand-600 font-semibold text-xs">{p.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-800">{p.name}</p>
                  <p className="text-xs text-surface-400">{p.mobile}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className={`animate-slide-up stagger-${i + 1}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-surface-400 mb-1">{stat.label}</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${stat.text}`}>{stat.value}</p>
                  </div>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Live Feed */}
        <Card className="animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-semibold text-surface-800">Today&apos;s Check-ins</h3>
            <Badge className="bg-brand-50 text-brand-700">{data?.today_feed.length || 0}</Badge>
          </div>
          {!data || data.today_feed.length === 0 ? (
            <p className="text-surface-400 text-sm py-6 text-center">No check-ins today yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.today_feed.map((item) => (
                <div key={item._id} className="flex items-center justify-between py-2.5 px-3 bg-surface-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-xs">#{item.session_number}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-800">{item.patient_name}</p>
                      <p className="text-xs text-surface-400">{item.patient_mobile}</p>
                    </div>
                  </div>
                  <span className="text-xs text-surface-400 tabular-nums">{new Date(item.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Alerts */}
        <div className="space-y-4">
          {/* Completing Soon */}
          {data && data.completing_soon.length > 0 && (
            <Card className="animate-slide-up border-l-4 border-l-amber-400">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-surface-800">Completing Soon</h3>
                <Badge className="bg-amber-50 text-amber-700">{data.completing_soon.length}</Badge>
              </div>
              <div className="space-y-2">
                {data.completing_soon.map((p) => (
                  <Link key={p._id} href={`/admin/patients/${p._id}`}
                    className="flex items-center justify-between py-2 px-3 bg-amber-50/50 rounded-xl hover:bg-amber-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-surface-800">{p.name}</p>
                      <p className="text-xs text-surface-400">{p.package_name}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">{p.sessions_remaining} left</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* No Show - patients who haven't visited in 7+ days */}
          {data && data.no_show.length > 0 && (
            <Card className="animate-slide-up border-l-4 border-l-orange-400">
              <div className="flex items-center gap-2 mb-3">
                <UserX className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-surface-800">No Show</h3>
                <Badge className="bg-orange-50 text-orange-700">{data.no_show.length}</Badge>
              </div>
              <p className="text-xs text-surface-400 mb-3">Active patients who haven&apos;t visited in 7+ days</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.no_show.map((p) => (
                  <div key={p._id} className="flex items-center justify-between py-2 px-3 bg-orange-50/50 rounded-xl">
                    <Link href={`/admin/patients/${p._id}`} className="flex-1">
                      <p className="text-sm font-medium text-surface-800">{p.name}</p>
                      <p className="text-xs text-surface-400">{p.package_name}</p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800">{p.days_since}d ago</Badge>
                      <a href={`https://wa.me/${p.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Expiring Soon */}
          {data && data.expiring_soon.length > 0 && (
            <Card className="animate-slide-up border-l-4 border-l-red-400">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-surface-800">Expiring Soon</h3>
                <Badge className="bg-red-50 text-red-700">{data.expiring_soon.length}</Badge>
              </div>
              <div className="space-y-2">
                {data.expiring_soon.map((p) => (
                  <div key={p._id} className="flex items-center justify-between py-2 px-3 bg-red-50/50 rounded-xl">
                    <Link href={`/admin/patients/${p._id}`} className="flex-1">
                      <p className="text-sm font-medium text-surface-800">{p.name}</p>
                      <p className="text-xs text-surface-400">{p.package_name}</p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800">{p.days_left}d left</Badge>
                      <a href={`https://wa.me/${p.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-red-100 transition-colors">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Expired Patients */}
          {data && data.expired_patients > 0 && (
            <Card className="animate-slide-up border-l-4 border-l-surface-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-600">{data.expired_patients} expired patient{data.expired_patients > 1 ? 's' : ''}</span>
                </div>
                <Link href="/admin/patients">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* QR Code Section */}
          <Card className="animate-slide-up">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <ScanLine className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="font-semibold text-surface-800 mb-1">QR Check-in URL</h3>
              <p className="text-surface-400 text-xs mb-3">Print this for your clinic</p>
              <div className="inline-flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-xl px-4 py-2">
                <code className="text-xs text-brand-600 font-mono">
                  {origin ? `${origin}/checkin` : '/checkin'}
                </code>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Session Modal */}
      <Modal open={quickSessionOpen} onClose={() => setQuickSessionOpen(false)} title="Quick Session">
        <div className="space-y-4">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
            <p className="text-xs text-brand-700">
              Select an active patient from the dropdown and start their session instantly.
            </p>
          </div>

          {activePatientsLoading ? (
            <div className="py-6 text-center text-surface-400 text-sm">Loading patients...</div>
          ) : activePatients.length === 0 ? (
            <div className="py-6 text-center text-surface-400 text-sm">No active patients with pending sessions</div>
          ) : (
            <>
              <select
                value={selectedPatientId}
                onChange={(e) => { setSelectedPatientId(e.target.value); setQuickResult(null); }}
                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select a patient...</option>
                {activePatients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — {p.pending_sessions} pending ({p.completed_sessions}/{p.total_sessions})
                  </option>
                ))}
              </select>

              {selectedPatientId && (() => {
                const p = activePatients.find(x => x._id === selectedPatientId);
                if (!p) return null;
                return (
                  <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-surface-800">{p.name}</p>
                        <p className="text-xs text-surface-400">{p.mobile} &middot; {p.package_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand-600">{p.pending_sessions}</p>
                        <p className="text-[10px] text-surface-400">pending</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(p.completed_sessions / p.total_sessions) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-surface-400 mt-1">{p.completed_sessions} of {p.total_sessions} sessions completed</p>
                  </div>
                );
              })()}
            </>
          )}

          {quickResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              quickResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {quickResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {quickResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setQuickSessionOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleQuickSession} loading={quickLoading} disabled={!selectedPatientId} className="flex-1"
              icon={<Zap className="w-4 h-4" />}>
              Start Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
