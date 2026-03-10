'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, Search, Play, CheckCircle, AlertCircle, User, CalendarPlus, Calendar, X, ChevronDown } from 'lucide-react';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

interface PatientItem {
  _id: string;
  name: string;
  mobile: string;
  status: string;
  package_name: string;
  total_sessions: number;
  sessions_completed: number;
  pending_sessions: number;
}

type Tab = 'quick' | 'manage';

function PatientCombobox({
  patients,
  loading,
  open,
  onOpenChange,
  onSelect,
}: {
  patients: PatientItem[];
  loading: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (p: PatientItem) => void;
}) {
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? patients.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.mobile.includes(query)
      )
    : patients;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOpenChange]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger / Search input */}
      <div
        onClick={() => onOpenChange(true)}
        className={`w-full flex items-center bg-white border rounded-xl transition-all cursor-pointer ${
          open ? 'border-brand-400 ring-2 ring-brand-100' : 'border-surface-200 hover:border-surface-300'
        }`}
      >
        <Search className="w-4 h-4 text-surface-300 ml-3 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onOpenChange(true); }}
          onFocus={() => onOpenChange(true)}
          placeholder="Search or select a patient..."
          className="flex-1 px-3 py-3 bg-transparent text-sm focus:outline-none"
        />
        <ChevronDown className={`w-4 h-4 text-surface-400 mr-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-surface-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-surface-100 rounded-lg shimmer" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center">
                <User className="w-8 h-8 mx-auto mb-1 text-surface-200" />
                <p className="text-surface-400 text-sm">
                  {query ? 'No matching patients' : 'No patients available'}
                </p>
              </div>
            ) : (
              filtered.slice(0, 15).map((p) => (
                <button
                  key={p._id}
                  onClick={() => { onSelect(p); setQuery(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-50 transition-colors cursor-pointer text-left border-b border-surface-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center shrink-0">
                    <span className="text-surface-600 font-semibold text-xs">{p.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{p.name}</p>
                    <p className="text-xs text-surface-400">{p.mobile} &middot; {p.package_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-brand-600">{p.sessions_completed}/{p.total_sessions}</p>
                    <p className="text-[10px] text-accent-amber">{p.pending_sessions} left</p>
                  </div>
                </button>
              ))
            )}
          </div>
          {filtered.length > 15 && (
            <div className="px-3 py-2 border-t border-surface-100 bg-surface-50">
              <p className="text-xs text-surface-400 text-center">Type to filter {filtered.length} patients...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuickSessionPage() {
  const [tab, setTab] = useState<Tab>('quick');
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; patientId?: string } | null>(null);

  // Manage tab state
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manageResult, setManageResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetchWithRetry('/api/patients?stats=true');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const active = data
        .filter((p: PatientItem) => p.status === 'active' && p.pending_sessions > 0)
        .sort((a: PatientItem, b: PatientItem) => a.name.localeCompare(b.name));
      setPatients(active);
    } catch {
      setPatients([]);
    }
    setLoading(false);
  };

  const startSession = async (patient: PatientItem) => {
    setStartingId(patient._id);
    setResult(null);
    try {
      const res = await fetchWithRetry('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient._id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: 'error', message: data.error, patientId: patient._id });
      } else {
        setResult({
          type: 'success',
          message: `Session ${data.sessions_completed}/${data.total_sessions} started for ${patient.name}`,
          patientId: patient._id,
        });
        fetchPatients();
      }
    } catch {
      setResult({ type: 'error', message: 'Failed to start session', patientId: patient._id });
    }
    setStartingId(null);
  };

  // Backdate session
  const handleBackdateSession = async () => {
    if (!selectedPatient || !selectedDate) return;
    setSubmitting(true);
    setManageResult(null);
    try {
      const res = await fetchWithRetry('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatient._id, date: selectedDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setManageResult({ type: 'error', message: data.error });
      } else {
        setManageResult({
          type: 'success',
          message: `Session ${data.sessions_completed}/${data.total_sessions} added for ${selectedPatient.name} on ${new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        });
        setSelectedDate('');
        setSelectedPatient(null);
        fetchPatients();
      }
    } catch {
      setManageResult({ type: 'error', message: 'Failed to add session' });
    }
    setSubmitting(false);
  };

  // Get yesterday's date as default max for backdate
  const getMaxDate = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  // Get patient start_date as min for backdate (use 90 days ago as fallback)
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  };

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Quick Session</h1>
        <p className="text-surface-400 text-sm mt-1">Start or manage patient sessions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-surface-100 p-1 rounded-xl">
        <button
          onClick={() => setTab('quick')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            tab === 'quick'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          Start Session
        </button>
        <button
          onClick={() => setTab('manage')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            tab === 'manage'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          <CalendarPlus className="w-4 h-4" />
          Add Past Session
        </button>
      </div>

      {/* ===== Quick Session Tab ===== */}
      {tab === 'quick' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or mobile..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
            />
          </div>

          {/* Patient List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl p-4 border border-surface-100 shimmer h-20" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-surface-100 text-center">
              <User className="w-10 h-10 mx-auto mb-2 text-surface-200" />
              <p className="text-surface-400 text-sm">
                {search ? 'No matching patients found' : 'No active patients with pending sessions'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((patient) => {
                const isStarting = startingId === patient._id;
                const patientResult = result?.patientId === patient._id ? result : null;

                return (
                  <div key={patient._id} className="bg-white rounded-xl border border-surface-100 p-4 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-surface-800 truncate">{patient.name}</h3>
                        </div>
                        <p className="text-xs text-surface-400 mt-0.5">{patient.mobile}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">
                            {patient.package_name}
                          </span>
                          <span className="text-xs text-surface-500">
                            {patient.sessions_completed}/{patient.total_sessions} done
                          </span>
                          <span className="text-xs font-semibold text-accent-amber">
                            {patient.pending_sessions} pending
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all duration-500"
                            style={{ width: `${(patient.sessions_completed / patient.total_sessions) * 100}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => startSession(patient)}
                        disabled={isStarting}
                        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
                      >
                        {isStarting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4" fill="white" />
                            Start
                          </>
                        )}
                      </button>
                    </div>

                    {/* Result message */}
                    {patientResult && (
                      <div className={`mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                        patientResult.type === 'success'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {patientResult.type === 'success' ? (
                          <CheckCircle className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        {patientResult.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && (
            <p className="text-xs text-surface-300 text-center">
              Showing {filtered.length} active patient{filtered.length !== 1 ? 's' : ''} with pending sessions
            </p>
          )}
        </>
      )}

      {/* ===== Manage Sessions Tab ===== */}
      {tab === 'manage' && (
        <>
          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
            <CalendarPlus className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Add a session for a past date when a patient completed their session but forgot to check in. Select the patient and the date they actually visited.
            </p>
          </div>

          {/* Step 1: Select Patient — Searchable Combobox */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-surface-700">1. Select Patient</h3>

            {selectedPatient ? (
              /* Selected patient card */
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-brand-600 font-bold text-sm">{selectedPatient.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-surface-800 truncate">{selectedPatient.name}</p>
                      <p className="text-xs text-surface-500">{selectedPatient.mobile} &middot; {selectedPatient.package_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-600">{selectedPatient.sessions_completed}/{selectedPatient.total_sessions}</p>
                      <p className="text-[10px] text-surface-400">{selectedPatient.pending_sessions} pending</p>
                    </div>
                    <button
                      onClick={() => { setSelectedPatient(null); setSelectedDate(''); setManageResult(null); setDropdownOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-brand-100 transition-colors cursor-pointer"
                      title="Change patient"
                    >
                      <X className="w-4 h-4 text-surface-400" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-brand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${(selectedPatient.sessions_completed / selectedPatient.total_sessions) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              /* Searchable dropdown */
              <PatientCombobox
                patients={patients}
                loading={loading}
                open={dropdownOpen}
                onOpenChange={setDropdownOpen}
                onSelect={(p) => { setSelectedPatient(p); setManageResult(null); setDropdownOpen(false); }}
              />
            )}
          </div>

          {/* Step 2: Select Date */}
          {selectedPatient && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-surface-700">2. Select Date</h3>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-300" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getMaxDate()}
                  min={getMinDate()}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
                />
              </div>

              {selectedDate && (
                <p className="text-xs text-surface-500">
                  Session will be recorded for <span className="font-semibold text-surface-700">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </p>
              )}
            </div>
          )}

          {/* Step 3: Submit */}
          {selectedPatient && selectedDate && (
            <button
              onClick={handleBackdateSession}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4" />
                  Add Session for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </>
              )}
            </button>
          )}

          {/* Result */}
          {manageResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl ${
              manageResult.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {manageResult.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {manageResult.message}
            </div>
          )}
        </>
      )}
    </div>
  );
}
