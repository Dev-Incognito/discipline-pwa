'use client';

import { useState, useEffect } from 'react';
import { sound } from '@/lib/sound/sound';
import {
  X,
  Copy,
  Check,
  Code2,
  Sparkles,
  AlertCircle,
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface RawJsonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialJson: string;
  onSave: (jsonStr: string) => Promise<{ success: boolean; error?: string }>;
}

export function RawJsonEditorModal({
  isOpen,
  onClose,
  title,
  initialJson,
  onSave,
}: RawJsonEditorModalProps) {
  const [jsonText, setJsonText] = useState(initialJson);
  const [isCopied, setIsCopied] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setJsonText(initialJson);
    setValidationStatus(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, [initialJson, isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText(jsonText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handlePrettify = () => {
    sound.playClick();
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setValidationStatus({ valid: true, message: 'JSON successfully formatted and validated.' });
      setSaveError(null);
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
          message: `Valid JSON Array with ${parsed.length} entries.`,
        });
      } else if (typeof parsed === 'object' && parsed !== null) {
        setValidationStatus({
          valid: true,
          message: `Valid JSON Object with keys: ${Object.keys(parsed).join(', ')}`,
        });
      } else {
        setValidationStatus({ valid: true, message: 'Valid JSON format.' });
      }
      setSaveError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
      setValidationStatus({ valid: false, message: `Syntax Error: ${msg}` });
    }
  };

  const handleSave = async () => {
    sound.playClick();
    setSaveError(null);
    setSaveSuccess(false);

    // Validate syntax first
    try {
      JSON.parse(jsonText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
      setSaveError(`Cannot save: ${msg}`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await onSave(jsonText);
      if (res.success) {
        sound.playFanfare();
        setSaveSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setSaveError(res.error || 'Failed to save configuration.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save operation failed.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl border border-gray-800 bg-[#0c1017] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800/80 px-6 py-4 bg-[#090d13]">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">{title}</h3>
              <p className="text-xs text-gray-400">
                View, edit, copy, or paste raw configuration JSON
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/60 bg-[#0e131c] px-6 py-2.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-700/80 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-95"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrettify}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-700/80 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Format / Prettify</span>
            </button>
            <button
              onClick={handleValidate}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-700/80 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-95"
            >
              <span>Validate Syntax</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-gray-500">
            {jsonText.split('\n').length} lines • {jsonText.length.toLocaleString()} chars
          </div>
        </div>

        {/* Validation / Alert Banner */}
        {validationStatus && (
          <div
            className={`flex items-center space-x-2 px-6 py-2 text-xs border-b ${
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

        {saveError && (
          <div className="flex items-center space-x-2 bg-rose-950/60 border-b border-rose-800/60 px-6 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center space-x-2 bg-emerald-950/60 border-b border-emerald-800/60 px-6 py-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">Configuration successfully saved and applied to database!</span>
          </div>
        )}

        {/* JSON Editor Textarea */}
        <div className="relative flex-1 min-h-[350px] max-h-[55vh] p-4 bg-[#070a0f]">
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setValidationStatus(null);
              setSaveError(null);
            }}
            spellCheck={false}
            className="w-full h-full min-h-[320px] resize-none rounded-xl border border-gray-800 bg-[#05070a] p-4 font-mono text-xs text-amber-300/90 leading-relaxed placeholder:text-gray-700 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            placeholder="Paste raw JSON here..."
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-800/80 bg-[#090d13] px-6 py-4">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            disabled={isSaving}
            className="rounded-xl border border-gray-700 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-800 hover:text-white transition-all active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wider"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save & Apply JSON</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
