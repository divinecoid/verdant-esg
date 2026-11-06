import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/50 p-4 backdrop-blur-[3px]" style={{ animation: 'fade .15s both' }} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 bg-card p-6"
        style={{ boxShadow: 'var(--shadow-pop)', animation: 'pop .2s cubic-bezier(.2,.7,.2,1) both' }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="display text-[28px] text-neutral-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-1 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
