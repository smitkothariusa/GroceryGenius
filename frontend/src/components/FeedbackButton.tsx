import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { feedbackService, supabase } from '../lib/supabase';

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

// Flag icon SVG (Material Design "flag" symbol)
const FlagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="22"
    height="22"
    aria-hidden="true"
  >
    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
  </svg>
);

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ isMobile }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');
      const { error } = await feedbackService.submit(user.id, category, message.trim());
      if (error) throw error;
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setMessage('');
        setCategory('suggestion');
      }, 2500);
    } catch {
      setSubmitError(t('feedback.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setMessage('');
    setCategory('suggestion');
    setSubmitted(false);
    setSubmitError('');
  };

  return (
    <>
      {/* FAB — white with purple flag icon, contrasts the purple-blue app gradient */}
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
          background: 'white',
          border: 'none',
          color: '#667eea',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
        }}
      >
        <FlagIcon />
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
              <span style={{ fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FlagIcon /> {t('feedback.title')}
              </span>
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

                {submitError && (
                  <div style={{ fontSize: '0.82rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    {submitError}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  style={{
                    padding: '0.7rem',
                    background: message.trim() && !submitting ? 'linear-gradient(45deg, #667eea, #764ba2)' : '#e5e7eb',
                    color: message.trim() && !submitting ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: message.trim() && !submitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? '…' : t('feedback.submit')}
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
