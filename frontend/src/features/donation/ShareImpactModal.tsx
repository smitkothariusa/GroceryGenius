import { useTranslation } from 'react-i18next';
import { useDonation } from './DonationContext';

interface ShareImpactModalProps {
  cardBg: string;
  mutedText: string;
  onSuccess: (message: string) => void;
}

/**
 * "Share your impact" modal, opened from the Donate tab's impact dashboard.
 * NOTE: this modal's headings/labels are hardcoded English (not routed
 * through i18n) in the pre-extraction source too — preserved as-is, not a
 * regression introduced by this refactor. The one toast it fires still goes
 * through i18n, matching the original.
 */
export function ShareImpactModal({ cardBg, mutedText, onSuccess }: ShareImpactModalProps) {
  const { t } = useTranslation();
  const { showShareModal, setShowShareModal, donationImpact, generateShareText } = useDonation();

  if (!showShareModal) return null;

  const shareImpact = async (platform: 'twitter' | 'facebook' | 'copy') => {
    const text = generateShareText();
    const url = 'https://grocerygenius.app'; // Replace with your actual URL

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank'
      );
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
        '_blank'
      );
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(text + '\n\n' + url);
      onSuccess(t('toasts.impactCopied'));
    }

    setShowShareModal(false);
  };

  return (
        <div
          className="modal-backdrop"
          onClick={() => setShowShareModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2500
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'scaleIn 0.3s ease-out',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowShareModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '1.5rem'
              }}
            >
              ×
            </button>

            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.75rem' }}>📱 Share Your Impact</h3>

            <div style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              padding: '2rem',
              borderRadius: '16px',
              color: 'white',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {donationImpact.totalMeals}
              </div>
              <div style={{ fontSize: '1.25rem', opacity: 0.95 }}>
                Meals Donated
              </div>
              <div style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                opacity: 0.9,
                borderTop: '1px solid rgba(255,255,255,0.3)',
                paddingTop: '1rem'
              }}>
                {Math.round(donationImpact.totalPounds)} lbs food saved • {Math.round(donationImpact.co2Saved)} lbs CO₂ prevented
              </div>
            </div>

            <p style={{
              color: mutedText,
              marginBottom: '2rem',
              lineHeight: '1.6',
              textAlign: 'center'
            }}>
              Inspire others to join the fight against hunger! Share your impact on social media.
            </p>

            {/* Preview */}
            <div style={{
              background: '#f9fafb',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: '600' }}>
                PREVIEW:
              </div>
              <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {generateShareText()}
              </div>
            </div>

            {/* Share Options */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button
                onClick={() => shareImpact('twitter')}
                style={{
                  padding: '1rem',
                  background: '#1DA1F2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                🐦 Share on Twitter
              </button>

              <button
                onClick={() => shareImpact('facebook')}
                style={{
                  padding: '1rem',
                  background: '#4267B2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                👥 Share on Facebook
              </button>

              <button
                onClick={() => shareImpact('copy')}
                style={{
                  padding: '1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                📋 Copy to Clipboard
              </button>
            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                <strong>💡 Tip:</strong> Sharing your impact encourages others to donate and helps grow the movement!
              </div>
            </div>
          </div>
        </div>
  );
}
