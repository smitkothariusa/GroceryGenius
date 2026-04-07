import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface MatchResult {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  pantry_id: string | null;
  pantry_name: string | null;
  pantry_quantity: number | null;
  pantry_unit: string | null;
  remainder: number | null;
}

interface DeductIngredientsModalProps {
  recipeName: string;
  matches: MatchResult[];
  loading: boolean;
  isMobile: boolean;
  onConfirm: (checkedPantryIds: string[]) => Promise<void>;
  onSkip: () => void;
}

const DeductIngredientsModal: React.FC<DeductIngredientsModalProps> = ({
  recipeName,
  matches,
  loading,
  isMobile,
  onConfirm,
  onSkip,
}) => {
  const { t } = useTranslation();

  const matchedItems = matches.filter(m => m.pantry_id !== null);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(matchedItems.map(m => m.pantry_id!))
  );
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(Array.from(checked));
    setConfirming(false);
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center', zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: isMobile ? '16px 16px 0 0' : '16px',
    padding: '1.5rem',
    width: isMobile ? '100%' : '540px',
    maxHeight: isMobile ? '80vh' : '70vh',
    display: 'flex', flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
  };

  return (
    <div style={overlayStyle} onClick={onSkip}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
          {t('mealPlan.deductModal.title')} — {recipeName}
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            ⏳ {t('mealPlan.deductModal.loading')}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {matches.map((m, idx) => {
                const isMatch = m.pantry_id !== null;
                const isDepleted = isMatch && m.remainder !== null && m.remainder <= 0;
                return (
                  <label key={idx} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: '8px',
                    background: isMatch ? '#f0fdf4' : '#f9fafb',
                    opacity: isMatch ? 1 : 0.55,
                    cursor: isMatch ? 'pointer' : 'default',
                  }}>
                    <input
                      type="checkbox"
                      disabled={!isMatch}
                      checked={isMatch && checked.has(m.pantry_id!)}
                      onChange={() => isMatch && toggle(m.pantry_id!)}
                      style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                        {m.ingredient_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                        {isMatch
                          ? isDepleted
                            ? t('mealPlan.deductModal.depleted', {
                                quantity: m.quantity, unit: m.unit,
                                pantryQuantity: m.pantry_quantity, pantryUnit: m.pantry_unit,
                              })
                            : t('mealPlan.deductModal.matchFound', {
                                quantity: m.quantity, unit: m.unit,
                                pantryQuantity: m.pantry_quantity, pantryUnit: m.pantry_unit,
                                remainder: Math.round(m.remainder! * 100) / 100,
                              })
                          : t('mealPlan.deductModal.notInPantry')}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleConfirm}
                disabled={confirming || checked.size === 0}
                style={{
                  flex: 1, padding: '0.75rem', fontWeight: '600', fontSize: '1rem',
                  background: checked.size === 0 ? '#d1fae5' : 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: checked.size === 0 || confirming ? 'not-allowed' : 'pointer',
                }}
              >
                {confirming ? '⏳' : `✓ ${t('mealPlan.deductModal.deductButton')}`}
              </button>
              <button
                onClick={onSkip}
                style={{
                  padding: '0.75rem 1.25rem', fontWeight: '600', fontSize: '1rem',
                  background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                }}
              >
                {t('mealPlan.deductModal.skipButton')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeductIngredientsModal;
