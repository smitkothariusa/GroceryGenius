import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FoodBank } from '../../types/donation';
import { foodBanks } from '../../data/foodBanks';
import { useDonation, type DropOffSite } from './DonationContext';
import { classifyPerishability } from './perishability';

// Mirrors the `PantryItem` shape in App.tsx (not centrally typed yet; this
// duplication matches the existing pattern in features/favorites for `Recipe`).
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;
}

interface DonationModalProps {
  cardBg: string;
  /** Read-only — owned by App.tsx (Pantry tab also reads/mutates it). */
  pantry: PantryItem[];
  getExpiringItems: () => PantryItem[];
  /** Records the donation (saves history/impact, removes items from pantry, switches to the Donate tab). Owned by App.tsx since it needs pantry/tab state. */
  onSubmit: (location: FoodBank | DropOffSite | null, items: PantryItem[]) => Promise<void>;
  onWarning: (message: string) => void;
}

/** The "record a donation" modal — opened from either the Donate tab or the Pantry tab's Donate button. */
export function DonationModal({ cardBg, pantry, getExpiringItems, onSubmit, onWarning }: DonationModalProps) {
  const { t } = useTranslation();
  const {
    showDonationModal,
    setShowDonationModal,
    selectedFoodBank,
    setSelectedFoodBank,
    selectedDropOffSite,
    setSelectedDropOffSite,
    itemsToDonate,
    setItemsToDonate,
    allItemsImpact,
    loadingImpact,
  } = useDonation();
  const [donatableOnly, setDonatableOnly] = useState(false);

  if (!showDonationModal) return null;

  return (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowDonationModal(false);
            setSelectedFoodBank(null);
            setSelectedDropOffSite(null);
            setItemsToDonate([]);
          }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2000, padding: '2rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            <button
              onClick={() => {
                setShowDonationModal(false);
                setSelectedFoodBank(null);
                setSelectedDropOffSite(null);
                setItemsToDonate([]);
              }}
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

            <h2 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: '700' }}>
              🎁 {t('donate.recordDonationTitle')}
            </h2>

            {/* Tip: accurate measurements = precise impact */}
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '0.875rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>💡</span>
              <div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#92400e',
                  marginBottom: '0.25rem',
                }}>
                  Get a more accurate meal count
                </div>
                <div style={{
                  fontSize: '0.82rem',
                  color: '#78350f',
                  lineHeight: 1.5,
                }}>
                  Add items to your pantry with exact weights (lbs or oz) and precise units — like{' '}
                  <span style={{ fontWeight: 700 }}>2 lbs ground turkey</span>{' '}
                  instead of <span style={{ fontWeight: 700 }}>1 pc turkey</span>.
                  The more specific your pantry entries, the more accurate your donation impact estimate.
                </div>
              </div>
            </div>

            {(selectedFoodBank || selectedDropOffSite) && (
              <div style={{
                background: '#f0f9ff',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem' }}>
                  {selectedFoodBank ? t('donate.donatingTo') : t('donate.droppingOffAt')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
                  {selectedFoodBank?.name || selectedDropOffSite?.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {selectedFoodBank
                    ? `${selectedFoodBank.address}, ${selectedFoodBank.city}`
                    : `${selectedDropOffSite?.address}, ${selectedDropOffSite?.city}, VA`
                  }
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                {t('donate.selectItemsToDonate')}
              </h3>

              {pantry.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
                  <p>{t('donate.pantryEmptyDonate')}</p>
                </div>
              ) : (
                <>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#374151',
                      flexWrap: 'wrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={donatableOnly}
                      onChange={(e) => setDonatableOnly(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    {t('donate.donatableOnlyFilter')}
                  </label>
                  <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflow: 'auto' }}>
                  {pantry.filter(item => {
                    if (!donatableOnly) return true;
                    return classifyPerishability(item) !== 'perishable';
                  }).map(item => {
                    const isSelected = itemsToDonate.includes(item.id);
                    const isExpiring = getExpiringItems().some(e => e.id === item.id);
                    const perishability = classifyPerishability(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isSelected) {
                            setItemsToDonate(prev => prev.filter(id => id !== item.id));
                          } else {
                            setItemsToDonate(prev => [...prev, item.id]);
                          }
                        }}
                        style={{
                          padding: '1rem',
                          background: isSelected ? '#dcfce7' : '#f9fafb',
                          border: `2px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer'
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {item.quantity} {item.unit}
                              {isExpiring && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  color: '#dc2626',
                                  fontWeight: '600'
                                }}>
                                  ⚠️ {t('donate.expiringSoon')}
                                </span>
                              )}
                              {perishability === 'non-perishable' && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  color: '#059669',
                                  fontWeight: '600'
                                }}>
                                  ✅ {t('donate.goodToDonate')}
                                </span>
                              )}
                              {perishability === 'perishable' && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  color: '#92400e',
                                  fontWeight: '600'
                                }}>
                                  🏠 {t('donate.keepAtHome')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          padding: '0.5rem 0.75rem',
                          background: isSelected ? '#10b981' : '#e5e7eb',
                          color: isSelected ? 'white' : '#6b7280',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          {loadingImpact ? '~' : `~${allItemsImpact[item.id]?.meals || 0} meals`}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </div>

            {/* Summary */}
            {itemsToDonate.length > 0 && (
              <div style={{
                background: '#f0fdf4',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '2px solid #86efac'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#166534' }}>
                  📊 {t('donate.donationImpactModal')}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                      {loadingImpact ? '~' : pantry
                        .filter(item => itemsToDonate.includes(item.id))
                        .reduce((total, item) => total + (allItemsImpact[item.id]?.meals || 0), 0)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                      {t('donate.estimatedMeals')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                      {itemsToDonate.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                      {t('donate.itemsSelected')}
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#166534'
                }}>
                  <strong>{t('donate.environmentalImpact')}</strong> ~
                  {loadingImpact ? '~' : Math.round(pantry
                    .filter(item => itemsToDonate.includes(item.id))
                    .reduce((total, item) => total + (allItemsImpact[item.id]?.co2_lbs || 0), 0))} {t('donate.co2Preventing')}
                </div>
              </div>
            )}

            {/* Food Bank Selection (if not pre-selected) */}
            {!selectedFoodBank && !selectedDropOffSite && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                  {t('donate.selectFoodBankLabel')}
                </h4>
                <select
                  onChange={(e) => {
                    const bank = foodBanks.find(b => b.id === e.target.value);
                    if (bank) setSelectedFoodBank(bank);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">{t('donate.chooseFoodBank')}</option>
                  {foodBanks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} - {bank.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowDonationModal(false);
                  setSelectedFoodBank(null);
                  setItemsToDonate([]);
                }}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                {t('common.cancel')}
              </button>

              <button
                onClick={async () => {
                  if ((!selectedFoodBank && !selectedDropOffSite) || itemsToDonate.length === 0) {
                    onWarning(t('toasts.pleaseSelectDonate'));
                    return;
                  }

                  const itemsToDonateFull = pantry.filter(item =>
                    itemsToDonate.includes(item.id)
                  );

                  await onSubmit(selectedFoodBank || selectedDropOffSite, itemsToDonateFull);
                }}
                disabled={(!selectedFoodBank && !selectedDropOffSite) || itemsToDonate.length === 0}
                style={{
                  padding: '1rem',
                  background: ((!selectedFoodBank && !selectedDropOffSite) || itemsToDonate.length === 0)
                    ? '#9ca3af'
                    : 'linear-gradient(45deg, #ec4899, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: ((!selectedFoodBank && !selectedDropOffSite) || itemsToDonate.length === 0)
                    ? 'not-allowed'
                    : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                🎁 {t('donate.recordDonationBtn')}
              </button>
            </div>

            {/* Tax Receipt Info */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                <strong>💡 {t('donate.taxTip')}</strong> {t('donate.taxTipMessage')}
              </div>
            </div>
          </div>
        </div>
  );
}
