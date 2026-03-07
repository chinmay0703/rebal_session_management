'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input, ProgressBar } from '@/components/ui/components';
import { Phone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckinData {
  patient: { _id: string; name: string; mobile: string };
  package: { name: string; total_sessions: number };
  sessions_completed: number;
  sessions_pending: number;
}

interface SessionResult {
  patient_name: string;
  sessions_completed: number;
  total_sessions: number;
}

type Step = 'input' | 'status' | 'success' | 'error';

export default function CheckinPage() {
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [checkinData, setCheckinData] = useState<CheckinData | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckStatus = async () => {
    if (!mobile.trim()) {
      toast.error('Please enter your mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/patients/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error);
        setStep('error');
        return;
      }
      setCheckinData(data);
      setStep('status');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!checkinData) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: checkinData.patient._id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setSessionResult(data);
      setStep('success');

      // Auto-reset after 5 seconds
      setTimeout(() => {
        setMobile('');
        setStep('input');
        setCheckinData(null);
        setSessionResult(null);
      }, 5000);
    } catch {
      toast.error('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMobile('');
    setStep('input');
    setCheckinData(null);
    setSessionResult(null);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <span className="text-white font-bold text-2xl">SM</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Session Manager</h1>
          <p className="text-surface-400 text-sm mt-1">Clinic Check-in</p>
        </div>

        {/* Input Step */}
        {step === 'input' && (
          <div className="bg-white rounded-2xl border border-surface-100 p-6 shadow-sm animate-slide-up">
            <h2 className="text-xl font-semibold text-surface-800 mb-1 text-center">Start Today&apos;s Session</h2>
            <p className="text-surface-400 text-sm text-center mb-6">Enter your registered mobile number</p>

            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-surface-200 bg-white text-surface-800 text-lg placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckStatus()}
                />
              </div>
              <Button onClick={handleCheckStatus} loading={loading} className="w-full" size="lg">
                Check Status
              </Button>
            </div>
          </div>
        )}

        {/* Status Step */}
        {step === 'status' && checkinData && (
          <div className="bg-white rounded-2xl border border-surface-100 p-6 shadow-sm animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <span className="text-brand-600 font-bold text-xl">{checkinData.patient.name.charAt(0)}</span>
              </div>
              <h2 className="text-xl font-semibold text-surface-800">{checkinData.patient.name}</h2>
              <p className="text-surface-400 text-sm">{checkinData.patient.mobile}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-surface-50">
                <span className="text-sm text-surface-500">Package</span>
                <span className="font-medium text-surface-800">{checkinData.package.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-50">
                <span className="text-sm text-surface-500">Total Sessions</span>
                <span className="font-medium text-surface-800">{checkinData.package.total_sessions}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-50">
                <span className="text-sm text-surface-500">Completed</span>
                <span className="font-semibold text-emerald-600">{checkinData.sessions_completed}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-surface-500">Pending</span>
                <span className="font-semibold text-amber-600">{checkinData.sessions_pending}</span>
              </div>

              <ProgressBar value={checkinData.sessions_completed} max={checkinData.package.total_sessions} />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={reset} className="flex-1">Back</Button>
              <Button onClick={handleStartSession} loading={loading} className="flex-1" size="lg">
                Start Session
              </Button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && sessionResult && (
          <div className="bg-white rounded-2xl border border-surface-100 p-8 shadow-sm animate-slide-up text-center">
            <div className="animate-check-success">
              <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-2">
              Welcome {sessionResult.patient_name}
            </h2>
            <p className="text-lg text-emerald-600 font-semibold mb-4">Session Started Successfully</p>

            <div className="bg-surface-50 rounded-xl p-4 mb-6">
              <p className="text-surface-500 text-sm">Sessions Completed</p>
              <p className="text-3xl font-bold text-brand-600">
                {sessionResult.sessions_completed} <span className="text-surface-400 text-lg font-normal">/ {sessionResult.total_sessions}</span>
              </p>
              <ProgressBar value={sessionResult.sessions_completed} max={sessionResult.total_sessions} className="mt-3" />
            </div>

            <p className="text-xs text-surface-400">This page will reset automatically in 5 seconds...</p>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={reset}>Reset Now</Button>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="bg-white rounded-2xl border border-surface-100 p-6 shadow-sm animate-slide-up text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Not Found</h2>
            <p className="text-surface-400 mb-6">{errorMsg}</p>
            <Button onClick={reset} className="w-full">Try Again</Button>
          </div>
        )}
      </div>
    </div>
  );
}
