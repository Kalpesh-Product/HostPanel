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

interface AppConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AppConfirmContext = createContext<AppConfirmContextValue>({
  confirm: () => Promise.resolve(false),
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

  return (
    <AppConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[200] bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4">
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
    </AppConfirmContext.Provider>
  );
}
