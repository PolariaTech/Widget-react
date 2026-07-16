import { AiIcon } from './AiIcon';
import { t } from '../i18n';

export function TypingIndicator() {
  return (
    <div className="flex gap-[8px] items-end w-full">
      <AiIcon />
      <div className="bg-[rgba(248,248,246,0.05)] border border-[rgba(248,248,246,0.07)] rounded-bl-[4px] rounded-br-[14px] rounded-tl-[14px] rounded-tr-[14px] px-[13px] py-[11px] flex gap-[4px] items-center">
        <span className="sr-only">{t('typingSrText')}</span>
        <span className="w-[5px] h-[5px] rounded-full bg-[rgba(0,229,204,0.6)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-[5px] h-[5px] rounded-full bg-[rgba(0,229,204,0.6)] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-[5px] h-[5px] rounded-full bg-[rgba(0,229,204,0.6)] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
