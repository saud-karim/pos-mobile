import React, { useState } from 'react';
import { useActivationStore } from '../store/activationStore';
import { Copy, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Activation: React.FC = () => {
  const [code, setCode] = useState('');
  const { hardwareId, activate, error } = useActivationStore();

  const handleCopy = () => {
    if (hardwareId) {
      navigator.clipboard.writeText(hardwareId);
      toast.success('تم نسخ بصمة الجهاز');
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hardwareId) return;

    if (!code.trim()) {
      toast.error("الرجاء إدخال كود التفعيل");
      return;
    }

    const success = activate(hardwareId, code);
    if (success) {
      toast.success('تم تفعيل النظام بنجاح!');
      // App.tsx will automatically re-render and hide this page
    } else {
      toast.error('كود التفعيل غير صحيح');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* Decorator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تفعيل النظام</h1>
          <p className="text-slate-400 text-sm">قم بنسخ بصمة الجهاز وأدخلها في لوحة التحكم للحصول على كود التفعيل.</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-2">بصمة الجهاز (Hardware ID)</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={hardwareId || 'جاري استخراج البصمة...'} 
              className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none text-left font-mono"
            />
            <button 
              onClick={handleCopy}
              disabled={!hardwareId}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
              title="نسخ"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleActivate}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">كود التفعيل</label>
            <div className="relative">
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="أدخل كود التفعيل الطويل هنا..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-left direction-ltr"
                dir="ltr"
              />
              <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={!hardwareId}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            تفعيل الآن
          </button>
        </form>

      </div>
    </div>
  );
};
