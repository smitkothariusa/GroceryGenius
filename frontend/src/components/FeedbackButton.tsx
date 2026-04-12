import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

type FeedbackCategory = 'bug' | 'suggestion' | 'complaint' | 'compliment';

interface FeedbackButtonProps {
  isMobile: boolean;
}

const CATEGORIES: { key: FeedbackCategory; emoji: string }[] = [
  { key: 'bug', emoji: '🐛' },
  { key: 'suggestion', emoji: '💡' },
  { key: 'complaint', emoji: '😤' },
  { key: 'compliment', emoji: '👍' },
];

const FEEDBACK_EMAIL = 'feedback@grocerygenius.org';

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ isMobile }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent(`[GroceryGenius] ${t(`feedback.categories.${category}`)}`);
    const body = encodeURIComponent(`${t(`feedback.categories.${category}`)}\n\n${message}`);
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setMessage('');
      setCategory('suggestion');
    }, 2500);
  };

  const handleClose = () => {
    setOpen(false);
    setMessage('');
    setCategory('suggestion');
    setSubmitted(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('feedback.buttonLabel')}
        title={t('feedback.buttonLabel')}
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '1.25rem',
          zIndex: 9500,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          fontSize: '1.35rem',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.65)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.5)';
        }}
      >
        💬
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('feedback.title')}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 9600,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: isMobile ? '16px 16px 0 0' : '16px',
            width: isMobile ? '100%' : '380px',
            maxHeight: isMobile ? '85vh' : 'auto',
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0 0' }}>
                <div style={{ width: '36px', height: '4px', background: '#e5e7eb', borderRadius: '2px' }} />
              </div>
            )}

            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: '700', fontSize: '1rem' }}>💬 {t('feedback.title')}</span>
              <button
                onClick={handleClose}
                aria-label={t('feedback.close')}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.1rem', cursor: 'pointer', opacity: 0.85, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                <div style={{ fontWeight: '700', color: '#374151', fontSize: '1rem' }}>{t('feedback.thankYou')}</div>
              </div>
            ) : (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                {/* Category picker */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: '0.5rem' }}>
                    {t('feedback.categoryLabel')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    {CATEGORIES.map(({ key, emoji }) => (
                      <button
                        key={key}
                        onClick={() => setCategory(key)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          border: category === key ? '2px solid #667eea' : '1.5px solid #e5e7eb',
                          borderRadius: '10px',
                          background: category === key ? '#f5f3ff' : 'white',
                          cursor: 'pointer',
                          fontWeight: category === key ? '700' : '400',
                          fontSize: '0.82rem',
                          color: category === key ? '#5b4fcf' : '#374151',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {emoji} {t(`feedback.categories.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: '0.5rem' }}>
                    {t('feedback.messageLabel')}
                  </div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={t('feedback.messagePlaceholder')}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#667eea'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim()}
                  style={{
                    padding: '0.7rem',
                    background: message.trim() ? 'linear-gradient(45deg, #667eea, #764ba2)' : '#e5e7eb',
                    color: message.trim() ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: message.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {t('feedback.submit')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
