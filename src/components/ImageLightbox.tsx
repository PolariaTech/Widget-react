import { t } from '../i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

// El cierre con Escape se maneja de forma centralizada en ChatModal.tsx (un
// solo listener para lightbox/historial/minimizar, con prioridades claras
// entre los tres) — ver la nota ahí.
export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(!!src);

  if (!src) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-[24px]" onClick={onClose}>
      <img src={src} alt={t('lightboxAlt')} className="max-w-full max-h-full object-contain rounded-[10px] shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button
        onClick={onClose}
        className="absolute top-[10px] right-[10px] w-[28px] h-[28px] rounded-[8px] flex items-center justify-center hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
        aria-label={t('lightboxClose')}
      >
        <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 16 16">
          <path d="M4 4L12 12M12 4L4 12" stroke="#F8F8F6" strokeLinecap="round" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
