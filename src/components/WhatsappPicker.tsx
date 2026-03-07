'use client';
import { useEffect, useState } from 'react';
import { Modal, Button, Badge } from '@/components/ui/components';
import { MessageCircle, Send, FileText } from 'lucide-react';

interface Template {
  _id: string;
  name: string;
  category: string;
  message: string;
}

interface PatientContext {
  name: string;
  mobile: string;
  package_name?: string;
  sessions_done?: number;
  sessions_left?: number;
  total_sessions?: number;
}

const categoryColors: Record<string, string> = {
  reminder: 'bg-amber-50 text-amber-700',
  review: 'bg-sky-50 text-sky-700',
  followup: 'bg-violet-50 text-violet-700',
  payment: 'bg-emerald-50 text-emerald-700',
  holiday: 'bg-rose-50 text-rose-700',
  general: 'bg-surface-100 text-surface-600',
};

function fillTemplate(message: string, ctx: PatientContext): string {
  return message
    .replace(/\{patient_name\}/g, ctx.name)
    .replace(/\{package_name\}/g, ctx.package_name || 'N/A')
    .replace(/\{sessions_done\}/g, String(ctx.sessions_done ?? 0))
    .replace(/\{sessions_left\}/g, String(ctx.sessions_left ?? 0))
    .replace(/\{total_sessions\}/g, String(ctx.total_sessions ?? 0));
}

export default function WhatsappPicker({ open, onClose, patient }: {
  open: boolean;
  onClose: () => void;
  patient: PatientContext;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMsg, setCustomMsg] = useState('');
  const [mode, setMode] = useState<'templates' | 'custom'>('templates');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/whatsapp-templates')
      .then((r) => r.json())
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, [open]);

  const sendViaWhatsApp = (message: string) => {
    const filled = fillTemplate(message, patient);
    const phone = patient.mobile.replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(filled)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Send WhatsApp Message" size="lg">
      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex gap-2">
          <button onClick={() => setMode('templates')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${mode === 'templates' ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'}`}>
            <FileText className="w-4 h-4 inline mr-1.5" />Templates
          </button>
          <button onClick={() => setMode('custom')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${mode === 'custom' ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'}`}>
            <MessageCircle className="w-4 h-4 inline mr-1.5" />Custom
          </button>
        </div>

        {/* Patient Info */}
        <div className="flex items-center gap-3 bg-surface-50 rounded-xl p-3">
          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
            <span className="text-brand-600 font-semibold">{patient.name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium text-surface-800">{patient.name}</p>
            <p className="text-xs text-surface-400">{patient.mobile}</p>
          </div>
        </div>

        {mode === 'templates' ? (
          <>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                <p className="text-surface-400 text-sm mb-3">No templates created yet</p>
                <p className="text-xs text-surface-400">Go to Templates page to create message templates</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {templates.map((t) => {
                  const preview = fillTemplate(t.message, patient);
                  return (
                    <div key={t._id}
                      className="border border-surface-200 rounded-xl p-4 hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-surface-800 text-sm">{t.name}</h4>
                          <Badge className={categoryColors[t.category] || categoryColors.general}>{t.category}</Badge>
                        </div>
                        <Button size="sm" onClick={() => sendViaWhatsApp(t.message)}
                          icon={<Send className="w-3.5 h-3.5" />}>
                          Send
                        </Button>
                      </div>
                      <p className="text-xs text-surface-500 whitespace-pre-wrap line-clamp-3 bg-white rounded-lg p-2 border border-surface-100">
                        {preview}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder={`Hi ${patient.name}, ...`}
              className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-800 placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all resize-none min-h-[120px]"
            />
            <Button onClick={() => sendViaWhatsApp(customMsg)} disabled={!customMsg.trim()}
              icon={<Send className="w-4 h-4" />} className="w-full">
              Send via WhatsApp
            </Button>
          </div>
        )}

        {/* Direct link fallback */}
        <div className="text-center pt-2 border-t border-surface-100">
          <button onClick={() => sendViaWhatsApp('')}
            className="text-xs text-surface-400 hover:text-brand-600 transition-colors cursor-pointer">
            Or open WhatsApp without a message
          </button>
        </div>
      </div>
    </Modal>
  );
}
