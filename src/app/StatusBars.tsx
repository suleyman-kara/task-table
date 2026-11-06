import { useSaveStatus } from '../data/saveStatus';
import { AlertIcon, CloseIcon, OfflineIcon } from './icons';

export function NetBar({ online, failed }: { online: boolean; failed: boolean }) {
  if (online && !failed) return null;
  return (
    <div className="net-bar" role="status">
      <OfflineIcon />
      <span>
        {!online
          ? 'Bağlantı yok. Değişiklikler bağlantı gelince kaydedilecek.'
          : 'Veriler yüklenemedi. Sayfayı yenileyip tekrar deneyin.'}
      </span>
    </div>
  );
}

/** "Kaydedilemedi · Tekrar dene" after a failed write. */
export function SaveToast() {
  const { error, retry, dismiss } = useSaveStatus();
  if (!error) return null;
  return (
    <div className="toast" role="alert">
      <AlertIcon />
      <span>{error}</span>
      {retry && (
        <button className="btn" onClick={() => retry()}>
          Tekrar dene
        </button>
      )}
      <button className="icon-btn" onClick={dismiss} aria-label="Bildirimi kapat">
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
