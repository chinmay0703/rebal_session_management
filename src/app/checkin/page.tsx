'use client';
import { useState, useEffect } from 'react';
import { ProgressBar } from '@/components/ui/components';
import { Phone, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Zap, Star, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const GOOGLE_REVIEW_URL = 'https://www.google.com/search?q=rebalance+physiotherapy+reviews';
const COOKIE_MOBILE_KEY = 'rb_mobile';

function getCookieMobile(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_MOBILE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function setCookieMobile(mobile: string) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_MOBILE_KEY}=${encodeURIComponent(mobile)}; expires=${expires}; path=/; SameSite=Lax`;
}

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

type Step = 'input' | 'status' | 'review' | 'success' | 'error';

export default function CheckinPage() {
  const [mobile, setMobile] = useState('');
  const [savedMobile, setSavedMobile] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [checkinData, setCheckinData] = useState<CheckinData | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [reviewOpened, setReviewOpened] = useState(false);
  const [reviewCountdown, setReviewCountdown] = useState(0);

  // Load saved mobile from cookie on mount
  useEffect(() => {
    const saved = getCookieMobile();
    if (saved) {
      setSavedMobile(saved);
    }
  }, []);

  // Success countdown
  useEffect(() => {
    if (step !== 'success') return;
    setCountdown(5);
    const timer = setInterval(() => setCountdown(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Review countdown - user must wait 5 seconds or open review to proceed
  useEffect(() => {
    if (step !== 'review') return;
    setReviewCountdown(5);
    setReviewOpened(false);
    const timer = setInterval(() => setReviewCountdown(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [step]);

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
      // Save mobile to cookie for next time
      setCookieMobile(mobile.trim());
      setSavedMobile(mobile.trim());
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

    // Show review popup if patient has <= 3 sessions remaining and hasn't reviewed yet this session
    if (checkinData.sessions_pending <= 3 && step !== 'review') {
      setStep('review');
      return;
    }

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

  const handleOpenReview = () => {
    window.open(GOOGLE_REVIEW_URL, '_blank');
    setReviewOpened(true);
    // After opening review, let them proceed immediately
    toast.success('Thank you! You can now start your session.');
  };

  const handleSkipReview = () => {
    // Can only skip after countdown
    if (reviewCountdown > 0 && !reviewOpened) return;
    handleStartSessionDirect();
  };

  const handleStartSessionDirect = async () => {
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

  const useSavedMobile = () => {
    setMobile(savedMobile);
  };

  const progressPct = checkinData
    ? Math.round((checkinData.sessions_completed / checkinData.package.total_sessions) * 100)
    : 0;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white">

      {/* Top header */}
      <div className="flex-shrink-0 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #035ca0 0%, #0274c3 40%, #0c91e6 100%)',
      }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative px-5 pt-12 pb-5">
          <h1 className="text-white font-semibold text-[16px]">Session Check-in</h1>
          <p className="text-white/60 text-[12px] mt-0.5">Tap to start your session</p>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 bg-surface-50 rounded-t-[20px] -mt-1 relative z-10">

        {/* ---- INPUT STEP ---- */}
        {step === 'input' && (
          <div className="w-full max-w-[360px] animate-slide-up -mt-4">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center animate-ring-pulse">
                <Phone className="w-8 h-8 text-brand-600" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-[21px] font-bold text-surface-900 tracking-tight">Start Your Session</h2>
              <p className="text-surface-400 text-[13px] mt-1">Enter your registered mobile number</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-surface-100/80">
              <div className="space-y-3.5">
                {/* Saved mobile suggestion */}
                {savedMobile && !mobile && (
                  <button
                    onClick={useSavedMobile}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-50/60 border border-brand-100 cursor-pointer hover:bg-brand-50 transition-all active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-semibold text-brand-700">+91 {savedMobile}</p>
                      <p className="text-[10px] text-brand-500">Tap to use saved number</p>
                    </div>
                    <div className="text-[10px] text-brand-400 font-medium bg-brand-100 px-2 py-1 rounded-md">Quick</div>
                  </button>
                )}

                {/* Input field */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 select-none">
                    <span className="text-[14px] text-surface-500 font-medium">+91</span>
                    <div className="w-px h-5 bg-surface-200" />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter mobile number"
                    maxLength={10}
                    autoFocus
                    className="w-full pl-[72px] pr-4 py-[14px] rounded-xl border-2 border-surface-200 bg-surface-50/50 text-surface-900 text-[18px] font-semibold tracking-[0.12em] placeholder:text-surface-300 placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(2,116,195,0.08)] outline-none transition-all duration-200"
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckStatus()}
                  />
                </div>

                {/* Button */}
                <button
                  onClick={handleCheckStatus}
                  disabled={loading || !mobile.trim()}
                  className="w-full py-[14px] rounded-xl text-white text-[15px] font-semibold active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(2,116,195,0.25)]"
                  style={{
                    background: loading ? '#0274c3' : 'linear-gradient(135deg, #0274c3 0%, #0c91e6 100%)',
                  }}
                >
                  {loading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : null}
                  {loading ? 'Checking...' : 'Check Status'}
                </button>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-center text-[11px] text-surface-300 mt-4">
              Use the number registered at the clinic
            </p>
          </div>
        )}

        {/* ---- STATUS STEP ---- */}
        {step === 'status' && checkinData && (
          <div className="w-full max-w-[360px] animate-slide-up -mt-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-surface-100/80 overflow-hidden">

              {/* Patient Identity */}
              <div className="px-5 pt-6 pb-5 text-center border-b border-surface-100">
                <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-3" style={{
                  background: 'linear-gradient(135deg, #0274c3 0%, #0c91e6 100%)',
                }}>
                  <span className="text-white font-bold text-[24px]">
                    {checkinData.patient.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-[18px] font-bold text-surface-900">{checkinData.patient.name}</h2>
                <span className="inline-block mt-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[11px] font-semibold">
                  {checkinData.package.name}
                </span>
              </div>

              {/* Progress ring + stats */}
              <div className="px-5 py-5">
                <div className="flex items-center justify-center gap-5 mb-5">
                  <div className="text-center">
                    <p className="text-[11px] text-surface-400 font-medium mb-1">Completed</p>
                    <p className="text-[28px] font-bold text-emerald-600 leading-none animate-count-up">{checkinData.sessions_completed}</p>
                  </div>
                  <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#f4f5f7" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#0274c3" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-[15px] font-bold text-brand-700">{progressPct}%</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] text-surface-400 font-medium mb-1">Remaining</p>
                    <p className="text-[28px] font-bold text-amber-500 leading-none animate-count-up">{checkinData.sessions_pending}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-surface-400 mb-1.5 px-0.5">
                  <span>{checkinData.sessions_completed} of {checkinData.package.total_sessions} sessions</span>
                  <span className="font-semibold text-brand-600">{progressPct}%</span>
                </div>
                <ProgressBar value={checkinData.sessions_completed} max={checkinData.package.total_sessions} className="mb-5" />

                {/* Action buttons */}
                <div className="flex gap-2.5">
                  <button
                    onClick={reset}
                    className="flex-1 py-[13px] rounded-xl bg-surface-50 border border-surface-200 text-surface-600 text-[14px] font-semibold hover:bg-surface-100 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleStartSession}
                    disabled={loading}
                    className="flex-[1.8] py-[13px] rounded-xl text-white text-[14px] font-semibold active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(5,150,105,0.25)]"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {loading ? 'Starting...' : 'Start Session'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- REVIEW STEP ---- */}
        {step === 'review' && checkinData && (
          <div className="w-full max-w-[360px] animate-slide-up -mt-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-amber-100 p-6 relative overflow-hidden">
              {/* Warm glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl -mt-20" />

              <div className="relative text-center">
                {/* Stars animation */}
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-8 h-8 text-amber-400 fill-amber-400 animate-count-up"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>

                <h2 className="text-[19px] font-bold text-surface-900 mb-1">
                  You&apos;re Almost Done! {checkinData.sessions_pending <= 1 ? '🎉' : ''}
                </h2>
                <p className="text-surface-500 text-[13px] mb-2 leading-relaxed">
                  Only <span className="font-bold text-amber-600">{checkinData.sessions_pending}</span> session{checkinData.sessions_pending !== 1 ? 's' : ''} left in your package!
                </p>

                <div className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-100">
                  <p className="text-[13px] text-amber-800 leading-relaxed">
                    <span className="font-semibold">Hi {checkinData.patient.name.split(' ')[0]}</span>, your journey with us matters!
                    A quick review helps other patients find quality care. It only takes 30 seconds.
                  </p>
                </div>

                {/* Review button - prominent */}
                <button
                  onClick={handleOpenReview}
                  className="w-full py-[14px] rounded-xl text-white text-[15px] font-semibold active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.3)] mb-3"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                >
                  <Star className="w-4.5 h-4.5 fill-white" />
                  Leave a Review
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </button>

                {/* Continue button - subtle, with countdown */}
                <button
                  onClick={handleSkipReview}
                  disabled={reviewCountdown > 0 && !reviewOpened}
                  className={`w-full py-[13px] rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    reviewOpened
                      ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(5,150,105,0.25)]'
                      : reviewCountdown > 0
                        ? 'bg-surface-100 text-surface-300 cursor-not-allowed'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : reviewOpened ? (
                    <Zap className="w-4 h-4" />
                  ) : null}
                  {loading
                    ? 'Starting...'
                    : reviewOpened
                      ? 'Continue to Session'
                      : reviewCountdown > 0
                        ? `Please wait (${reviewCountdown}s)...`
                        : 'Skip & Start Session'
                  }
                </button>

                {reviewOpened && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-2 animate-fade-in">
                    Thank you for your review!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- SUCCESS STEP ---- */}
        {step === 'success' && sessionResult && (
          <div className="w-full max-w-[360px] animate-slide-up text-center -mt-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-emerald-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-emerald-400/10 blur-3xl -mt-20" />

              <div className="relative">
                <div className="animate-check-success mb-4">
                  <div className="w-[76px] h-[76px] rounded-full bg-emerald-50 flex items-center justify-center mx-auto ring-4 ring-emerald-50">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                </div>

                <h2 className="text-[20px] font-bold text-surface-900 mb-0.5">
                  Welcome, {sessionResult.patient_name}!
                </h2>
                <p className="text-emerald-600 font-semibold text-[13px] mb-5">Session started successfully</p>

                <div className="bg-gradient-to-br from-surface-50 to-brand-50/40 rounded-xl p-5 mb-5">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-[40px] font-bold text-brand-600 tabular-nums leading-none animate-count-up">
                      {sessionResult.sessions_completed}
                    </span>
                    <span className="text-surface-300 text-[18px] font-normal"> / {sessionResult.total_sessions}</span>
                  </div>
                  <ProgressBar value={sessionResult.sessions_completed} max={sessionResult.total_sessions} className="mt-3" />
                  <p className="text-[11px] text-surface-400 mt-2 font-medium">sessions completed</p>
                </div>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center">
                    <span className="text-[12px] font-bold text-surface-500 tabular-nums">{countdown}</span>
                  </div>
                  <p className="text-[12px] text-surface-400">seconds until reset</p>
                </div>
                <button onClick={reset} className="text-[13px] text-brand-600 font-semibold cursor-pointer hover:text-brand-700 transition-colors py-1 px-3">
                  Reset Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- ERROR STEP ---- */}
        {step === 'error' && (
          <div className="w-full max-w-[360px] animate-slide-up text-center -mt-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-red-100/80 p-6">
              <div className="w-[68px] h-[68px] rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-9 h-9 text-red-400" />
              </div>
              <h2 className="text-[18px] font-bold text-surface-800 mb-1">Not Found</h2>
              <p className="text-surface-400 text-[13px] mb-6 leading-relaxed max-w-[280px] mx-auto">{errorMsg}</p>
              <button
                onClick={reset}
                className="w-full py-[14px] rounded-xl text-white text-[15px] font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_12px_rgba(2,116,195,0.25)]"
                style={{ background: 'linear-gradient(135deg, #0274c3 0%, #0c91e6 100%)' }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer with logo */}
      <div className="flex-shrink-0 py-4 px-5 flex items-center justify-center gap-2">
        <img src="/logo.jpg" alt="Logo" className="h-5 w-auto rounded object-contain opacity-40" />
        <div className="w-px h-3 bg-surface-200" />
        <p className="text-[10px] text-surface-300">Session Manager</p>
      </div>
    </div>
  );
}
