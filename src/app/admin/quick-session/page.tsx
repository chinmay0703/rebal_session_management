'use client';

import { useState, useEffect } from 'react';
import { Zap, Search, Play, CheckCircle, AlertCircle, User } from 'lucide-react';

interface PatientItem {
  _id: string;
  name: string;
  mobile: string;
  status: string;
  package_name: string;
  total_sessions: number;
  completed_sessions: number;
  pending_sessions: number;
}

export default function QuickSessionPage() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; patientId?: string } | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients?stats=true');
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
      const res = await fetch('/api/sessions', {
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
        // Refresh list
        fetchPatients();
      }
    } catch {
      setResult({ type: 'error', message: 'Failed to start session', patientId: patient._id });
    }
    setStartingId(null);
  };

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Quick Session</h1>
        <p className="text-surface-400 text-sm mt-1">Start a session for any active patient</p>
      </div>

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
                        {patient.completed_sessions}/{patient.total_sessions} done
                      </span>
                      <span className="text-xs font-semibold text-accent-amber">
                        {patient.pending_sessions} pending
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                        style={{ width: `${(patient.completed_sessions / patient.total_sessions) * 100}%` }}
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
    </div>
  );
}
