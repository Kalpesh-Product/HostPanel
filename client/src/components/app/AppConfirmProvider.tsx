import React, { createContext, useCallback, useContext, useState } from 'react';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

interface PromptField {
  name: string;
  label?: string;
  type?: 'text' | 'number';
  defaultValue?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface PromptOptions {
  title?: string;
  message?: string;
  fields: PromptField[];
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PromptState {
  open: boolean;
  title?: string;
  message?: string;
  fields: PromptField[];
  values: Record<string, string>;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (value: Record<string, string> | null) => void;
}

interface AppConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<Record<string, string> | null>;
}

const AppConfirmContext = createContext<AppConfirmContextValue>({
  confirm: () => Promise.resolve(false),
  prompt: () => Promise.resolve(null),
});

export function useAppConfirm() {
  return useContext(AppConfirmContext);
}

export function AppConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    resolve: () => {},
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        ...options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve(true);
    setState((prev) => ({ ...prev, open: false }));
  };

  const handleCancel = () => {
    state.resolve(false);
    setState((prev) => ({ ...prev, open: false }));
  };

  const [promptState, setPromptState] = useState<PromptState>({
    open: false,
    title: '',
    message: '',
    fields: [],
    values: {},
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    resolve: () => {},
  });

  const prompt = useCallback((options: PromptOptions): Promise<Record<string, string> | null> => {
    return new Promise<Record<string, string> | null>((resolve) => {
      setPromptState({
        open: true,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        ...options,
        values: Object.fromEntries(options.fields.map((field) => [field.name, field.defaultValue || ''])),
        resolve,
      });
    });
  }, []);

  const isPromptValid = promptState.fields.every((field) => promptState.values[field.name]?.trim());

  const handlePromptConfirm = () => {
    if (!isPromptValid) return;
    const trimmed = Object.fromEntries(Object.entries(promptState.values).map(([key, value]) => [key, value.trim()]));
    promptState.resolve(trimmed);
    setPromptState((prev) => ({ ...prev, open: false }));
  };

  const handlePromptCancel = () => {
    promptState.resolve(null);
    setPromptState((prev) => ({ ...prev, open: false }));
  };

  return (
    <AppConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[20000] bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8">
              {state.title && (
                <h2 className="text-lg font-black text-slate-900 mb-2">{state.title}</h2>
              )}
              {state.message && (
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{state.message}</p>
              )}
            </div>
            <div className="px-6 md:px-8 pb-6 md:pb-8 flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                {state.cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm"
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {promptState.open && (
        <div className="fixed inset-0 z-[20000] bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 space-y-4">
              {promptState.title && (
                <h2 className="text-lg font-black text-slate-900 -mb-2">{promptState.title}</h2>
              )}
              {promptState.message && (
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{promptState.message}</p>
              )}
              {promptState.fields.map((field, index) => (
                <div key={field.name}>
                  {field.label && (
                    <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{field.label}</label>
                  )}
                  <input
                    autoFocus={index === 0}
                    type={field.type || 'text'}
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder}
                    value={promptState.values[field.name] ?? ''}
                    onChange={(event) =>
                      setPromptState((prev) => ({ ...prev, values: { ...prev.values, [field.name]: event.target.value } }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handlePromptConfirm();
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 md:px-8 pb-6 md:pb-8 flex gap-3 justify-end">
              <button
                onClick={handlePromptCancel}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                {promptState.cancelLabel}
              </button>
              <button
                onClick={handlePromptConfirm}
                disabled={!isPromptValid}
                className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {promptState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppConfirmContext.Provider>
  );
}
