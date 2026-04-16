"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  addToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-in px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-success text-white"
                : toast.type === "error"
                  ? "bg-danger text-white"
                  : "bg-accent text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
