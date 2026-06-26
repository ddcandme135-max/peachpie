import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [sidebarW, setSidebarW] = useState(100);
  const [sidebarPlayer, setSidebarPlayer] = useState(false);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const timersRef = useRef({});

  useEffect(() => {
    function handler(e) { setSidebarW(e.detail.isOpen ? 290 : 100); }
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, []);

  useEffect(() => {
    function handler(e) { setSidebarPlayer(e.detail.sidebarPlayer); }
    window.addEventListener("player-sidebar-toggle", handler);
    return () => window.removeEventListener("player-sidebar-toggle", handler);
  }, []);

  useEffect(() => {
    function handler(e) { setMiniPlayerVisible(e.detail.visible); }
    window.addEventListener("miniplayer-visibility", handler);
    return () => window.removeEventListener("miniplayer-visibility", handler);
  }, []);

  const dismissToast = useCallback((id) => {
    clearTimeout(timersRef.current[`fade_${id}`]);
    clearTimeout(timersRef.current[`remove_${id}`]);
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    timersRef.current[`remove_${id}`] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback((message, type = "info", onUndo, icon) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, onUndo, icon, removing: false }]);
    timersRef.current[`fade_${id}`] = setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    }, 2700);
    timersRef.current[`remove_${id}`] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: "fixed",
        bottom: miniPlayerVisible ? 102 : 24,
        left: "50%",
        transform: `translateX(calc(-50% - ${sidebarPlayer ? 0 : 60 + (290 - sidebarW) * 0.5}px))`,
        transition: "bottom 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
        display: "flex", flexDirection: "column-reverse", gap: 10,
        zIndex: 99999, pointerEvents: "none",
        alignItems: "center",
      }}>
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            removing={t.removing}
            onUndo={t.onUndo}
            icon={t.icon}
            onDismiss={() => dismissToast(t.id)}
          />
        ))}
      </div>
      <style>{`
        @keyframes toastIn  { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes toastOut { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(12px) } }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}
