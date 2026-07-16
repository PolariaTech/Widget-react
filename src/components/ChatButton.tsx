import { t } from '../i18n';
import { SparkleIcon } from './SparkleIcon';

interface ChatButtonProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatButton({ onClick, hasUnread }: ChatButtonProps) {
  return (
    <button
      id="chat-button"
      onClick={onClick}
      className="fixed bottom-6 right-6 h-[60px] w-[60px] rounded-[18px] transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent z-40 overflow-hidden flex items-center justify-center p-px"
      style={{ backgroundImage: 'linear-gradient(135deg, rgba(0, 229, 204, 0.2) 0%, rgba(0, 85, 200, 0.15) 100%)' }}
      aria-label={t('chatButtonOpen')}
    >
      {hasUnread && <div className="absolute top-[2px] right-[2px] w-[12px] h-[12px] rounded-full bg-[#00E5CC] border-2 border-[#040e14] z-10" />}
      <div className="absolute border border-[rgba(0,229,204,0.3)] inset-0 pointer-events-none rounded-[18px] shadow-[0px_4px_32px_0px_rgba(0,229,204,0.25)]" />
      <div className="h-[36.594px] w-[38.094px] relative shrink-0">
        <div className="absolute inset-[31.56%_30.31%]">
          <div className="absolute inset-[-85.56%_-77%]">
            <SparkleIcon className="block w-full h-full" glow />
          </div>
        </div>
      </div>
    </button>
  );
}
