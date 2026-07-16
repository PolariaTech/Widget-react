/** Ícono de panel lateral (mismo glyph para colapsar y expandir, como en VS Code/Notion). */
export function SidebarToggleIcon() {
  return (
    <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 16 16">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="#F8F8F6" strokeOpacity="0.45" strokeWidth="1.3" />
      <line x1="6.5" y1="3" x2="6.5" y2="13" stroke="#F8F8F6" strokeOpacity="0.45" strokeWidth="1.3" />
    </svg>
  );
}
