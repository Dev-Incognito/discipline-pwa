'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getRawRanksJsonAction,
  saveRawRanksJsonAction,
  getRawAchievementsJsonAction,
  saveRawAchievementsJsonAction,
  getRawSettingsJsonAction,
  saveRawSettingsJsonAction,
  getFullConfigJsonAction,
  saveFullConfigJsonAction,
} from '@/actions/adminActions';
import { sound } from '@/lib/sound/sound';
import {
  Code2,
  Copy,
  Check,
  Sparkles,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Layers,
  Award,
  Sliders,
  Database,
} from 'lucide-react';

type ConfigCategory = 'ranks' | 'achievements' | 'settings' | 'full';

export default function AdminJsonConfigPage() {
  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('ranks');
  const [jsonText, setJsonText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async (cat: ConfigCategory) => {
    setIsLoading(true);
    setErrorMsg(null);
    setValidationStatus(null);

    let res: { success: boolean; json?: string; error?: string };
    if (cat === 'ranks') res = await getRawRanksJsonAction();
    else if (cat === 'achievements') res = await getRawAchievementsJsonAction();
    else if (cat === 'settings') res = await getRawSettingsJsonAction();
    else res = await getFullConfigJsonAction();

    if (res.success && res.json) {
      setJsonText(res.json);
    } else {
      setErrorMsg(res.error || 'Failed to load configuration JSON');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData(activeCategory);
  }, [activeCategory, loadData]);

  const handleCopy = async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText(jsonText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePrettify = () => {
    sound.playClick();
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setValidationStatus({ valid: true, message: 'JSON successfully formatted and validated.' });
      setErrorMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format';
      setValidationStatus({ valid: false, message: `Syntax Error: ${msg}` });
    }
  };

  const handleValidate = () => {
    sound.playClick();
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        setValidationStatus({
          valid: true,
          message: `Valid JSON Array with ${parsed.length} items.`,
        });
      } else if (typeof parsed === 'object' && parsed !== null) {
        setValidationStatus({
          valid: true,
          message: `Valid JSON Object with keys: ${Object.keys(parsed).join(', ')}`,
        });
      } else {
        setValidationStatus({ valid: true, message: 'Valid JSON format.' });
      }
      setErrorMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
      setValidationStatus({ valid: false, message: `Syntax Error: ${msg}` });
    }
  };

  const handleSave = async () => {
    sound.playClick();
    setErrorMsg(null);

    try {
      JSON.parse(jsonText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
      setErrorMsg(`Cannot save: ${msg}`);
      return;
    }

    setIsSaving(true);
    let res: { success: boolean; error?: string };
    if (activeCategory === 'ranks') res = await saveRawRanksJsonAction(jsonText);
    else if (activeCategory === 'achievements') res = await saveRawAchievementsJsonAction(jsonText);
    else if (activeCategory === 'settings') res = await saveRawSettingsJsonAction(jsonText);
    else res = await saveFullConfigJsonAction(jsonText);

    if (res.success) {
      sound.playFanfare();
      setToast('Configuration applied and synced to database successfully!');
      setTimeout(() => setToast(null), 3500);
      await loadData(activeCategory);
    } else {
      setErrorMsg(res.error || 'Failed to apply configuration.');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 rounded-xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-sm text-emerald-200 shadow-xl backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-gray-100 flex items-center gap-2.5">
            <Code2 className="h-7 w-7 text-amber-500" />
            Raw JSON Configuration
          </h1>
          <p className="text-sm text-gray-400">
            Export, edit, copy, or paste raw JSON payloads directly into PostgreSQL without touching source code
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Apply to Database</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => {
            sound.playClick();
            setActiveCategory('ranks');
          }}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
            activeCategory === 'ranks'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'border border-gray-800 bg-gray-900/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Ranks JSON</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveCategory('achievements');
          }}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
            activeCategory === 'achievements'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'border border-gray-800 bg-gray-900/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Achievements JSON</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveCategory('settings');
          }}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
            activeCategory === 'settings'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'border border-gray-800 bg-gray-900/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>App Settings JSON</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveCategory('full');
          }}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
            activeCategory === 'full'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'border border-gray-800 bg-gray-900/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Full Backup / Restore</span>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="flex items-start space-x-3 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 text-xs text-amber-300/90">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold uppercase tracking-wider text-amber-400">
            Direct Configuration Control
          </span>
          <p className="text-gray-400 leading-relaxed">
            Pasting raw JSON directly modifies live records in the database. Ensure required keys are present
            (e.g., <code className="text-amber-300 font-mono">id</code>, <code className="text-amber-300 font-mono">name</code>, <code className="text-amber-300 font-mono">minXp</code> for ranks). Hierarchy and syntax are validated before saving.
          </p>
        </div>
      </div>

      {/* Main Editor Card */}
      <div className="rounded-2xl border border-gray-800 bg-[#0c1017] shadow-xl overflow-hidden">
        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 bg-[#090d13] px-5 py-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                  <span>Copy Payload</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrettify}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Format / Prettify</span>
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>Validate Syntax</span>
            </button>
          </div>

          <div className="text-xs font-mono text-gray-500">
            {jsonText.split('\n').length} lines • {jsonText.length.toLocaleString()} characters
          </div>
        </div>

        {/* Validation & Error Alerts */}
        {validationStatus && (
          <div
            className={`flex items-center space-x-2 px-5 py-2.5 text-xs border-b ${
              validationStatus.valid
                ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                : 'bg-rose-950/40 border-rose-800/40 text-rose-400'
            }`}
          >
            {validationStatus.valid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-mono">{validationStatus.message}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center space-x-2 bg-rose-950/60 border-b border-rose-800/60 px-5 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Textarea */}
        <div className="relative p-4 bg-[#070a0f]">
          {isLoading ? (
            <div className="flex min-h-[480px] items-center justify-center">
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                  Loading JSON Payload...
                </span>
              </div>
            </div>
          ) : (
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setValidationStatus(null);
                setErrorMsg(null);
              }}
              spellCheck={false}
              rows={24}
              className="w-full rounded-xl border border-gray-800/80 bg-[#05070a] p-4 font-mono text-xs text-amber-300/90 leading-relaxed placeholder:text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              placeholder="Paste raw JSON here..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
