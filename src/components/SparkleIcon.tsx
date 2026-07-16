import { useId } from 'react';

interface SparkleIconProps {
  className?: string;
  /** Aplica el resplandor difuso detrás del ícono (usado en ChatButton, no en Header). */
  glow?: boolean;
}

/**
 * Ícono "sparkle" de la marca Mateo Support. Antes reimplementado a mano en
 * ChatButton.tsx y Header.tsx (mismo dibujo, exportado de Figma a 2 tamaños
 * distintos con leve diferencia de redondeo) — ahora un solo componente,
 * escalado vía `className` en vez de duplicar los 12 `<path>`.
 */
export function SparkleIcon({ className, glow = false }: SparkleIconProps) {
  const filterId = useId();

  return (
    <svg className={className} fill="none" preserveAspectRatio="none" viewBox="0 0 38.0937 36.594">
      <g filter={glow ? `url(#${filterId})` : undefined}>
        <path d="M17.5471 24.296L16.6097 22.4212L14.5476 22.7962" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M17.5471 12.298L16.6097 14.1728L14.5476 13.7978" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M20.5466 24.296L21.484 22.4212L23.5462 22.7962" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M20.5466 12.298L21.484 14.1728L23.5462 13.7978" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M22.7962 25.0458L20.5466 20.5466H17.5471" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M22.7962 11.5482L20.5466 16.0474L21.6714 18.297" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M11.548 18.297H16.4223L17.5471 16.0474" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M25.0459 16.7972L23.921 18.297L25.0459 19.7968" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M26.5456 18.297H21.6714L20.5466 20.5466" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M13.0478 16.7972L14.1726 18.297L13.0478 19.7968" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M15.2975 25.0458L17.5471 20.5466L16.4223 18.297" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
        <path d="M15.2975 11.5482L17.5471 16.0474H20.5466" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49975" />
      </g>
      {glow && (
        <defs>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="36.594" id={filterId} width="38.0937" x="0" y="0">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset />
            <feGaussianBlur stdDeviation="5.39908" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.898039 0 0 0 0 0.8 0 0 0 0.4 0" />
            <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_72" />
            <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_72" mode="normal" result="shape" />
          </filter>
        </defs>
      )}
    </svg>
  );
}
