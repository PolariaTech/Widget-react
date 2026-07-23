interface ChatTableProps {
  headers: string[];
  rows: string[][];
}

/**
 * Tabla Polaria para el chat: un solo contenedor (sin chrome "TABLA"/contador
 * ni burbuja externa encima).
 */
export function ChatTable({ headers, rows }: ChatTableProps) {
  return (
    <div className="chat-table-root w-full min-w-0 overflow-hidden rounded-[14px] border border-[rgba(0,229,204,0.2)] bg-[rgba(0,229,204,0.06)] backdrop-blur-sm">
      <div className="chat-table-wrap overflow-x-auto">
        <table className="w-max min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-[rgba(2,6,9,0.35)]">
              {headers.map((header, headerIndex) => (
                <th
                  key={`h-${headerIndex}-${header}`}
                  scope="col"
                  className="px-[12px] py-[10px] text-[10px] font-semibold uppercase tracking-[0.04em] text-[rgba(248,248,246,0.5)] whitespace-nowrap border-b border-[rgba(248,248,246,0.08)]"
                >
                  {header || '—'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-[12px] py-[14px] text-center text-[rgba(248,248,246,0.45)] chat-msg-text"
                >
                  —
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className="border-t border-[rgba(248,248,246,0.06)] transition-colors hover:bg-[rgba(0,229,204,0.08)]"
                >
                  {headers.map((_, cellIndex) => (
                    <td
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className={`px-[12px] py-[10px] chat-msg-text align-top max-w-[220px] ${
                        cellIndex === 0
                          ? 'font-medium text-[rgba(248,248,246,0.95)] whitespace-nowrap'
                          : 'text-[rgba(248,248,246,0.82)]'
                      }`}
                    >
                      <span className="block break-words">{row[cellIndex] || '—'}</span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
