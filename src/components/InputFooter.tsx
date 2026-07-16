import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import type { SelectedImage } from '../types';
import { IMAGE_VALIDATION, MAX_MESSAGE_LENGTH, isAllowedImageType } from '../config';
import { useAutoGrowTextarea } from '../hooks/useAutoGrowTextarea';
import { confirmDestructiveAction, showImageContentMismatchError, showImageTooLargeError, showImageTypeError } from '../lib/alerts';
import { readFileSignature, sniffImageMimeType } from '../lib/fileSignature';
import { t } from '../i18n';

interface InputFooterProps {
  selectedImage: SelectedImage | null;
  onImageSelected: (image: SelectedImage) => void;
  onImageRemoved: () => void;
  onPreviewClick: (src: string) => void;
  onSend: (text: string) => void;
  isSending: boolean;
}

function readImageFile(file: File, onLoaded: (image: SelectedImage) => void) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const data = ev.target?.result;
    if (typeof data !== 'string') return;
    onLoaded({ data, name: file.name, type: file.type });
  };
  reader.readAsDataURL(file);
}

export function InputFooter({ selectedImage, onImageSelected, onImageRemoved, onPreviewClick, onSend, isSending }: InputFooterProps) {
  const [text, setText] = useState('');
  const textareaRef = useAutoGrowTextarea(text);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Espejo síncrono de `selectedImage`, leído dentro de `handleFile`: el pegado
  // desde el portapapeles puede disparar varias veces seguidas antes de que
  // React refleje el estado ya confirmado en el diálogo de reemplazo.
  const selectedImageRef = useRef(selectedImage);
  selectedImageRef.current = selectedImage;

  const handleFile = async (file: File) => {
    if (selectedImageRef.current) {
      const confirmed = await confirmDestructiveAction(
        t('confirmReplaceImageTitle'),
        t('confirmReplaceImageText'),
        t('confirmReplaceImageConfirm'),
      );
      if (!confirmed) return;
    }

    if (file.size > IMAGE_VALIDATION.MAX_FILE_SIZE) {
      showImageTooLargeError(file.size);
      return;
    }

    if (!isAllowedImageType(file.type)) {
      showImageTypeError(file.type);
      return;
    }

    // `file.type` viene de la extensión/metadata que reporta el sistema, no
    // del contenido — un PDF renombrado a `.jpg` puede pasar el chequeo de
    // arriba igual. Los magic bytes confirman que el contenido es realmente
    // una de las imágenes soportadas antes de aceptarlo.
    const signature = await readFileSignature(file);
    if (!sniffImageMimeType(signature)) {
      showImageContentMismatchError(file.name);
      return;
    }

    readImageFile(file, onImageSelected);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleRemoveImage = () => {
    onImageRemoved();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (!item.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file) continue;

      e.preventDefault();
      void handleFile(file);
      return;
    }
  };

  const handleSend = () => {
    if (isSending) return;
    const toSend = text;
    setText('');
    onSend(toSend);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isSending) return;
      handleSend();
    }
  };

  return (
    <div className="w-full border-t border-[rgba(0,229,204,0.08)] pb-[12px] pt-[8px] px-[12px] shrink-0">
      <div className="max-w-[640px] mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_VALIDATION.ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileInputChange}
        />

        {selectedImage && (
          <div className="mb-[8px]">
            <div className="flex items-center gap-[8px] bg-[rgba(0,229,204,0.06)] border border-[rgba(0,229,204,0.15)] rounded-[10px] px-[10px] py-[7px]">
              <img
                src={selectedImage.data}
                className="w-[32px] h-[32px] rounded-[6px] object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
                alt={t('previewAlt')}
                role="button"
                tabIndex={0}
                onClick={() => onPreviewClick(selectedImage.data)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPreviewClick(selectedImage.data);
                  }
                }}
              />
              <span className="text-[11px] text-[rgba(248,248,246,0.6)] flex-1 truncate">{selectedImage.name}</span>
              <button
                onClick={handleRemoveImage}
                className="text-[rgba(248,248,246,0.35)] hover:text-[rgba(248,248,246,0.8)] transition-colors text-[18px] leading-none shrink-0 cursor-pointer"
                aria-label={t('removeImageAria')}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="bg-[rgba(248,248,246,0.04)] border border-[rgba(0,229,204,0.15)] rounded-[14px] flex gap-[8px] items-end px-[13px] py-[9px] w-full">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[8px] w-[28px] h-[28px] flex items-center justify-center hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent shrink-0 cursor-pointer"
            aria-label={t('attachImageAria')}
          >
            <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 14 14">
              <path
                d="M2.33363 9.91638V11.0836C2.33363 11.393 2.45651 11.6896 2.67525 11.9084C2.89399 12.1271 3.19066 12.25 3.5 12.25H10.5C10.8093 12.25 11.106 12.1271 11.3248 11.9084C11.5435 11.6896 11.6664 11.393 11.6664 11.0836V9.91638"
                stroke="#F8F8F6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4" strokeWidth="1.225"
              />
              <path d="M9.33362 4.66638L7 2.33363L4.66638 4.66638" stroke="#F8F8F6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4" strokeWidth="1.225" />
              <path d="M7 2.33363V9.33363" stroke="#F8F8F6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4" strokeWidth="1.225" />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isSending}
            placeholder={t('messagePlaceholder')}
            aria-label={t('messageAriaLabel')}
            maxLength={MAX_MESSAGE_LENGTH}
            className="bg-transparent text-[13px] leading-[19px] text-[#f8f8f6] placeholder-[rgba(248,248,246,0.3)] w-full outline-none border-none resize-none min-h-[24px] max-h-[120px] overflow-y-auto flex-1 focus:ring-0 disabled:opacity-50"
          />

          <button
            onClick={handleSend}
            disabled={isSending}
            className="bg-[rgba(0,229,204,0.15)] border border-[rgba(0,229,204,0.3)] rounded-[10px] w-[28px] h-[28px] flex items-center justify-center hover:bg-[rgba(0,229,204,0.28)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[rgba(0,229,204,0.15)]"
            aria-label={t('sendMessageAria')}
          >
            {isSending ? (
              <svg className="w-[14px] h-[14px] animate-spin" fill="none" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="5.5" stroke="#00E5CC" strokeOpacity="0.2" strokeWidth="1.5" />
                <path d="M12.5 7A5.5 5.5 0 007 1.5" stroke="#00E5CC" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            ) : (
              <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 14 14">
                <path
                  d="M7.41941 11.0689C7.43881 11.1172 7.47252 11.1584 7.51602 11.1871C7.55953 11.2157 7.61075 11.2303 7.6628 11.229C7.71486 11.2277 7.76527 11.2104 7.80725 11.1796C7.84923 11.1488 7.88078 11.1059 7.89768 11.0567L11.2154 1.35873C11.2318 1.31351 11.2348 1.26456 11.2244 1.21762C11.2139 1.1707 11.1903 1.12771 11.1563 1.09371C11.1223 1.0597 11.0793 1.0361 11.0324 1.02563C10.9855 1.01517 10.9365 1.01828 10.8913 1.03462L1.19335 4.35232C1.1441 4.36922 1.10119 4.40077 1.07038 4.44275C1.03958 4.48473 1.02235 4.53514 1.02102 4.5872C1.01968 4.63925 1.0343 4.69047 1.06292 4.73398C1.09154 4.77748 1.13278 4.8112 1.1811 4.83059L5.22871 6.45371C5.35666 6.50493 5.47292 6.58155 5.57047 6.67892C5.66801 6.77629 5.74483 6.89241 5.79629 7.02027L7.41941 11.0689Z"
                  stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1375"
                />
                <path d="M11.1547 1.09587L5.57069 6.67931" stroke="#00E5CC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1375" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
