import { useTranslation } from 'react-i18next';
import { calculateMeals } from '../../data/foodBanks';
import { useDonation } from './DonationContext';
import { AchievementsPanel } from '../achievements/AchievementsPanel';
import { classifyPerishability } from './perishability';
import { daysUntilExpiry } from '../../lib/pantryExpiry';
import { safeStorage } from '../../lib/safeStorage';

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

interface DonationSectionProps {
  isMobile: boolean;
  cardBg: string;
  mutedText: string;
  /** Read-only — owned by App.tsx (Pantry tab also reads/mutates it). */
  getExpiringItems: () => PantryItem[];
  onSuccess: (message: string) => void;
  onWarning: (message: string) => void;
}

/** JSX for the "Donate" tab: impact dashboard, expiring-items nudge, food-bank/drop-off directory, and donation history. */
export function DonationSection({
  isMobile,
  cardBg,
  mutedText,
  getExpiringItems,
  onSuccess,
  onWarning,
}: DonationSectionProps) {
  const { t } = useTranslation();
  const {
    donationImpact,
    donationHistory,
    setShowDonationModal,
    setSelectedFoodBank,
    setItemsToDonate,
    setSelectedDropOffSite,
    setShowShareModal,
    donateSubTab,
    setDonateSubTab,
    userLocation,
    setUserLocation,
    locationPermission,
    setLocationPermission,
    getSortedFoodBanks,
    getSortedDropOffSites,
  } = useDonation();

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setLocationPermission('granted');

          // Save to localStorage
          safeStorage.setItem('locationPermission', 'granted');
          safeStorage.setItem('userLocation', JSON.stringify(location));

          onSuccess(t('toasts.locationGranted'));
        },
        () => {
          onWarning(t('toasts.locationDenied'));
        }
      );
    } else {
      onWarning(t('toasts.geolocationUnsupported'));
      setLocationPermission('denied');
      safeStorage.setItem('locationPermission', 'denied');
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Only nudge users to donate expiring items that are actually donatable —
  // a perishable item (e.g. bananas) expiring soon should be used/discarded
  // at home, not suggested for a food-bank drop-off. 'unknown' items (not
  // classifiable either way) are still included, matching how the Pantry
  // tab's "Donatable only" filter treats them.
  const expiringDonatableItems = getExpiringItems().filter(
    item => classifyPerishability(item) !== 'perishable'
  );

  return (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Region availability notice — food banks & drop-off sites are
                currently Hampton Roads only, with more regions coming. */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              color: '#3730a3',
              padding: isMobile ? '0.75rem 0.9rem' : '0.85rem 1.1rem',
              borderRadius: '12px',
              marginBottom: isMobile ? '1rem' : '1.5rem',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              lineHeight: 1.45,
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }} aria-hidden="true">📍</span>
              <span>{t('donate.regionNotice')}</span>
            </div>
            {/* Impact Dashboard */}
            <div style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              padding: isMobile ? '1.5rem' : '2rem',
              borderRadius: '16px',
              marginBottom: isMobile ? '1rem' : '2rem',
              color: 'white'
            }}>
              <h2 style={{
                margin: '0 0 1rem 0',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>❤️ {t('donate.yourImpact')}</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: isMobile ? '0.75rem' : '1rem'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{donationImpact.totalMeals}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>{t('donate.mealsDonated')}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{donationImpact.totalDonations}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>{t('donate.donationsMade')}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{Math.round(donationImpact.co2Saved)}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>{t('donate.co2Prevented')}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{Math.round(donationImpact.co2Saved / 48)}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>{t('donate.treesEquivalent')}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{Math.round(donationImpact.co2Saved / 19.6)}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>{t('donate.gasGalsSaved')}</div>
                </div>
              </div>
            </div>
            {donationImpact.totalMeals > 0 && (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.5)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                📱 {t('donate.shareImpact')}
              </button>
            )}

            {/* Streaks & Badges */}
            <AchievementsPanel isMobile={isMobile} cardBg={cardBg} mutedText={mutedText} />

            {/* Expiring Items Alert */}
            {expiringDonatableItems.length > 0 && (
              <div data-tour="donate-expiring-list" style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #f59e0b',
                padding: '2rem',
                borderRadius: '20px',
                marginBottom: '2rem',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative background elements */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: '50%',
                  filter: 'blur(30px)'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Header with icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}>
                      ⚠️
                    </div>
                    <div>
                      <h3 style={{
                        margin: 0,
                        color: '#92400e',
                        fontSize: '1.75rem',
                        fontWeight: '700'
                      }}>
                        {t('donate.itemsExpiring', { count: expiringDonatableItems.length })}
                      </h3>
                      <p style={{
                        margin: '0.25rem 0 0 0',
                        color: '#b45309',
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}>
                        {t('donate.turnWaste')}
                      </p>
                    </div>
                  </div>

                  {/* Items Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                  }}>
                    {expiringDonatableItems.map(item => {
                      const daysUntil = daysUntilExpiry(item) ?? 0;

                      return (
                        <div key={item.id} style={{
                          background: 'white',
                          padding: '1rem',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: '2px solid #fbbf24',
                          transition: 'all 0.2s',
                          cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }}>
                          <div style={{
                            fontSize: '2rem',
                            marginBottom: '0.5rem',
                            textAlign: 'center'
                          }}>
                            {item.category === 'produce' ? '🥬' :
                            item.category === 'dairy' ? '🥛' :
                            item.category === 'meat' ? '🍖' :
                            item.category === 'canned' ? '🥫' :
                            item.category === 'grains' ? '🌾' : '📦'}
                          </div>
                          <div style={{
                            fontWeight: '700',
                            color: '#92400e',
                            marginBottom: '0.25rem',
                            fontSize: '0.95rem',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.name}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#b45309',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}>
                            {item.quantity} {item.unit}
                          </div>
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            background: daysUntil === 0 ? '#fee2e2' : daysUntil === 1 ? '#fed7aa' : '#fef3c7',
                            color: daysUntil === 0 ? '#dc2626' : daysUntil === 1 ? '#ea580c' : '#d97706',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            textAlign: 'center'
                          }}>
                            {daysUntil === 0 ? t('donate.today') :
                            daysUntil === 1 ? t('donate.tomorrow') :
                            t('donate.days', { count: daysUntil })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Impact Preview */}
                  <div style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    border: '2px solid #fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      fontSize: '2rem'
                    }}>
                      💚
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600', marginBottom: '0.25rem' }}>
                        {t('donate.potentialImpact')}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>
                        ~{expiringDonatableItems.reduce((total, item) => {
                          return total + calculateMeals(item.quantity, item.unit, item.name);
                        }, 0)} {t('donate.meals')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                        Prevention: ~{Math.round(expiringDonatableItems.reduce((total, item) => {
                          const pounds = item.unit === 'lbs' ? item.quantity : item.quantity * 0.5;
                          return total + (pounds * 3.8);
                        }, 0))} lbs CO₂
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => {
                      setItemsToDonate(expiringDonatableItems.map(i => i.id));
                      setShowDonationModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '1.25rem 2rem',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.4)';
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🎁</span>
                    {t('donate.donateToFoodBanks')}
                    <span style={{ fontSize: '1.5rem' }}>→</span>
                  </button>

                  {/* Helper Text */}
                  <div style={{
                    marginTop: '1rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#b45309',
                    fontWeight: '500'
                  }}>
                    💡 {t('donate.turnExpiringFood')}
                  </div>
                </div>
              </div>
            )}

            {/* Food Bank Directory */}
            <div data-tour="donate-map" style={{
              background: cardBg,
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '16px',
              marginBottom: isMobile ? '1rem' : '2rem'
            }}>
              <h2 style={{
                margin: '0 0 1rem 0',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>🎁 {t('donate.donateFood')}</h2>

              {/* Location Request Banner */}
              {locationPermission === 'pending' && (
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  padding: '1rem',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  border: '1px solid #fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>
                      📍 {t('donate.enableLocation')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                      {t('donate.locationDesc')}
                    </div>
                  </div>
                  <button
                    onClick={requestUserLocation}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {t('donate.enableLocationBtn')}
                  </button>
                </div>
              )}

              {locationPermission === 'granted' && userLocation && (
                <div style={{
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid #6ee7b7',
                  fontSize: '0.875rem',
                  color: '#065f46',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  ✅ {t('donate.showingNearest')}
                </div>
              )}

              {/* Sub-tabs */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                overflowX: 'auto'
              }}>
                <button
                  onClick={() => setDonateSubTab('foodbanks')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: donateSubTab === 'foodbanks' ? '3px solid #667eea' : '3px solid transparent',
                    color: donateSubTab === 'foodbanks' ? '#667eea' : mutedText,
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  🏛️ {t('donate.localFoodBanks')}
                </button>
                <button
                  onClick={() => setDonateSubTab('dropoffs')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: donateSubTab === 'dropoffs' ? '3px solid #667eea' : '3px solid transparent',
                    color: donateSubTab === 'dropoffs' ? '#667eea' : mutedText,
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  📦 {t('donate.dropOffSites')}
                </button>
              </div>

              {donateSubTab === 'foodbanks' && (
                <>
                  <h3 style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: isMobile ? '1.25rem' : '1.75rem'
                  }}>🏛️ {t('donate.localFoodBanksNear')}</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                    {getSortedFoodBanks().map(bank => {
                      const distance = userLocation && bank.coordinates
                        ? calculateDistance(userLocation.lat, userLocation.lng, bank.coordinates.lat, bank.coordinates.lng)
                        : null;

                      return (
                  <div
                    key={bank.id}
                    className="card-hover"
                    style={{
                      padding: isMobile ? '1rem' : '1.5rem',
                      background: '#f9fafb',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedFoodBank(bank);
                      setShowDonationModal(true);
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'stretch' : 'start',
                      marginBottom: '1rem',
                      gap: isMobile ? '1rem' : '0'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: isMobile ? '1.1rem' : '1.25rem',
                          color: '#1f2937'
                        }}>
                          {bank.name}
                        </h4>
                        <div style={{
                          color: '#6b7280',
                          fontSize: isMobile ? '0.75rem' : '0.875rem'
                        }}>
                          📍 {bank.address}, {bank.city}, {bank.state} {bank.zipCode}
                        </div>
                        {distance !== null && (
                          <div style={{
                            color: '#667eea',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            fontWeight: '600',
                            marginTop: '0.25rem'
                          }}>
                            📏 {t('donate.milesAway', { distance: distance.toFixed(1) })}
                          </div>
                        )}
                        <div style={{
                          color: '#6b7280',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          marginTop: '0.25rem'
                        }}>
                          📞 {bank.phone}
                        </div>
                        <div style={{
                          color: '#6b7280',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          marginTop: '0.25rem'
                        }}>
                          🕐 {t('donate.hoursLabel')}: {bank.hours}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(bank.address + ', ' + bank.city + ', ' + bank.state)}`, '_blank');
                        }}
                        style={{
                          padding: isMobile ? '0.75rem' : '0.5rem 1rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.875rem' : '0.875rem',
                          width: isMobile ? '100%' : 'auto'
                        }}
                      >
                        🗺️ {t('donate.directions')}
                      </button>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        {t('donate.acceptedItems')}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {bank.acceptedItems.map((item, idx) => {
                          const key = item.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
                          const translated = t(`donate.foodItems.${key}`, { defaultValue: item });
                          return (
                            <span key={idx} style={{
                              padding: '0.25rem 0.75rem',
                              background: '#dcfce7',
                              color: '#166534',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {translated}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#f0fdf4',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#166534',
                      fontWeight: '600'
                    }}>
                      {t('donate.clickToRecord')}
                    </div>
                  </div>
                      );
                    })}
              </div>
                </>
              )}

              {donateSubTab === 'dropoffs' && (
                <>
                  <h3 style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: isMobile ? '1.25rem' : '1.75rem'
                  }}>📦 {t('donate.dropOffSitesNear')}</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {getSortedDropOffSites().map((site) => {
                      const distance = userLocation
                        ? calculateDistance(userLocation.lat, userLocation.lng, site.lat, site.lng)
                        : null;

                      return (
                        <div
                          key={site.id}
                          className="card-hover"
                          style={{
                            padding: isMobile ? '1rem' : '1.5rem',
                            background: '#f9fafb',
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setSelectedDropOffSite(site);
                            setShowDonationModal(true);
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'stretch' : 'start',
                            marginBottom: '1rem',
                            gap: isMobile ? '1rem' : '0'
                          }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: isMobile ? '1.1rem' : '1.25rem',
                                color: '#1f2937'
                              }}>
                                {site.name}
                              </h4>
                              <div style={{
                                color: '#6b7280',
                                fontSize: isMobile ? '0.75rem' : '0.875rem'
                              }}>
                                📍 {site.address}, {site.city}, VA
                              </div>
                              {distance !== null && (
                                <div style={{
                                  color: '#667eea',
                                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                                  fontWeight: '600',
                                  marginTop: '0.25rem'
                                }}>
                                  📏 {t('donate.milesAway', { distance: distance.toFixed(1) })}
                                </div>
                              )}
                              <div style={{
                                color: '#6b7280',
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                marginTop: '0.25rem'
                              }}>
                                🕐 {t('donate.hoursLabel')}: {site.hours}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address + ', ' + site.city + ', VA')}`, '_blank');
                              }}
                              style={{
                                padding: isMobile ? '0.75rem' : '0.5rem 1rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: isMobile ? '0.875rem' : '0.875rem',
                                width: isMobile ? '100%' : 'auto'
                              }}
                            >
                              🗺️ {t('donate.directions')}
                            </button>
                          </div>

                          <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: '#f0fdf4',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#166534',
                            fontWeight: '600'
                          }}>
                            {t('donate.clickToRecordDropOff')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Donation History */}
            {donationHistory.length > 0 && (
              <div style={{ background: cardBg, padding: '2rem', borderRadius: '16px' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.75rem' }}>📋 {t('donate.donationHistory')}</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {donationHistory.map(donation => (
                    <div
                      key={donation.id}
                      style={{
                        padding: '1.5rem',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#1f2937' }}>
                            {donation.foodBank}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {new Date(donation.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: '#dcfce7',
                          borderRadius: '12px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534' }}>
                            {donation.totalMeals}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#166534' }}>{t('donate.meals')}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        {t('donate.itemsDonated')}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {donation.items.map((item, idx) => (
                          <span key={idx} style={{
                            padding: '0.5rem 0.75rem',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: '#4b5563'
                          }}>
                            {item.quantity} {item.unit} {item.name} ({item.estimatedMeals} meals)
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {donationHistory.length === 0 && (
              <div style={{
                background: cardBg,
                padding: '3rem',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❤️</div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('donate.startImpact')}</h3>
                <p style={{ color: mutedText, maxWidth: '500px', margin: '0 auto' }}>
                  {t('donate.startImpactMsg')}
                </p>
              </div>
            )}
          </div>
  );
}
