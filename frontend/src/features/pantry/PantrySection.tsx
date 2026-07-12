import { useTranslation } from 'react-i18next';
import { pantryService } from '../../lib/database';
import { isExpiringSoon } from '../../lib/pantryExpiry';
import { searchFoods, getSmartExpiryDate, getFoodDisplayName, getSuggestedUnits, type FoodEntry } from '../../data/foodDatabase';
import { useDonation } from '../donation/DonationContext';
import { usePantry, type PantryItem } from './PantryContext';

interface PantrySectionProps {
  isMobile: boolean;
  cardBg: string;
  mutedText: string;
  /** Read-only — owned by App.tsx's auth state; used to decide whether a delete needs a database call. */
  user: any;
  onSuccess: (message: string) => void;
  onWarning: (message: string) => void;
}

/** JSX for the "Pantry" tab: item list, add/edit forms, the smart-search cluster, and the scan/donate entry points. */
export function PantrySection({
  isMobile,
  cardBg,
  mutedText,
  user,
  onSuccess,
  onWarning,
}: PantrySectionProps) {
  const { t, i18n } = useTranslation();
  const {
    pantry, setPantry,
    pantryHasMore,
    pantryLoadingMore,
    showAddPantry, setShowAddPantry,
    newPantryItem, setNewPantryItem,
    smartSearchQuery, setSmartSearchQuery,
    smartSearchResults, setSmartSearchResults,
    selectedFood, setSelectedFood,
    smartSearchRef,
    manualQuery, setManualQuery,
    customUnitValue, setCustomUnitValue,
    isCustomUnit, setIsCustomUnit,
    editCustomUnit, setEditCustomUnit,
    isEditCustomUnit, setIsEditCustomUnit,
    editingPantryItem, setEditingPantryItem,
    showEditPantry, setShowEditPantry,
    setCameraSource,
    setScanMode,
    setShowImageUpload,
    getExpiringItems,
    loadMorePantry,
  } = usePantry();
  const { setItemsToDonate, setShowDonationModal } = useDonation();

  const handleEditPantryItem = (item: PantryItem) => {
    setEditingPantryItem(item);
    setIsEditCustomUnit(false);
    setEditCustomUnit('');
    setNewPantryItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate || '',
      emoji: item.emoji,
    });
    setShowEditPantry(true);
  };

  const handleSmartSearchChange = (query: string) => {
    setSmartSearchQuery(query);
    setSelectedFood(null);
    if (query.length >= 2) {
      const lang = i18n.language || 'en';
      setSmartSearchResults(searchFoods(query, lang));
    } else {
      setSmartSearchResults([]);
    }
  };

  const handleSelectFood = (food: FoodEntry) => {
    const lang = i18n.language || 'en';
    const displayName = getFoodDisplayName(food, lang);
    setSelectedFood(food);
    setSmartSearchQuery(displayName);
    setSmartSearchResults([]);
    setNewPantryItem(prev => ({
      ...prev,
      name: displayName,
      quantity: '' as any,
      unit: food.defaultUnit,
      category: food.category,
      expiryDate: '',
      emoji: food.emoji,
    }));
  };

  const handleAcceptSmartExpiry = () => {
    if (!selectedFood) return;
    const date = getSmartExpiryDate(selectedFood);
    setNewPantryItem(prev => ({ ...prev, expiryDate: date }));
  };

  const handleResetSmartSearch = () => {
    setSmartSearchQuery('');
    setSmartSearchResults([]);
    setSelectedFood(null);
    setManualQuery('');
    setCustomUnitValue('');
    setIsCustomUnit(false);
    setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '', emoji: undefined });
  };

  const handleSaveEditPantryItem = async () => {
    if (!editingPantryItem || !newPantryItem.name.trim()) return;
    const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
    try {
      await pantryService.update(editingPantryItem.id, {
        name: newPantryItem.name.trim(),
        quantity,
        unit: newPantryItem.unit,
        category: newPantryItem.category,
        expiryDate: newPantryItem.expiryDate || undefined,
        emoji: newPantryItem.emoji,
      });
      setPantry(prev => prev.map(item =>
        item.id === editingPantryItem.id
          ? {
              ...item,
              name: newPantryItem.name.trim(),
              quantity,
              unit: newPantryItem.unit,
              category: newPantryItem.category,
              expiryDate: newPantryItem.expiryDate || undefined,
              emoji: newPantryItem.emoji,
            }
          : item
      ));
      onSuccess(t('toasts.pantryItemUpdated'));
    } catch (err) {
      console.error('Error updating pantry item:', err);
      onWarning(t('toasts.failedAddItem'));
    }
    setShowEditPantry(false);
    setEditingPantryItem(null);
    setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '', emoji: undefined });
  };

  return (
          <div style={{
            background: cardBg,
            padding: isMobile ? '1rem' : '2rem', 
            borderRadius: '16px' 
          }}>
              <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between', 
              marginBottom: isMobile ? '1rem' : '2rem', 
              gap: '1rem'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>📦 {t('pantry.title')}</h2>
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'stretch' : 'flex-start'
              }}>
                  <button 
                    onClick={() => {
                      setCameraSource('pantry');
                      setScanMode('menu'); // Reset to menu
                      setShowImageUpload(true);
                    }}
                    data-tour="pantry-scan-btn"
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      flex: isMobile ? '1' : 'initial',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    📷 {t('pantry.scanBarcode')}
                  </button>

                  {getExpiringItems().length > 0 && (
                    <button 
                      onClick={() => {
                        setItemsToDonate(getExpiringItems().map(i => i.id));
                        setShowDonationModal(true);
                      }}
                      style={{
                        padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                        background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        flex: isMobile ? '1' : 'initial',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      🎁 {isMobile ? `${t('tabs.donate')} (${getExpiringItems().length})` : `${t('tabs.donate')} (${getExpiringItems().length})`}
                    </button>
                  )}
                  <button
                    data-tour="pantry-add-input"
                    className="desktop-add-btn"
                    onClick={() => {
                      if (showAddPantry) handleResetSmartSearch();
                      setShowAddPantry(!showAddPantry);
                    }}
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      flex: isMobile ? '1' : 'initial',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    {showAddPantry ? `✕ ${t('common.cancel')}` : `+ ${t('pantry.addItem')}`}
                  </button>
              </div>
            </div>
            {/* Edit Pantry Item Modal */}
            {showEditPantry && editingPantryItem && (
              <div 
                className="modal-backdrop"
                onClick={() => {
                  setShowEditPantry(false);
                  setEditingPantryItem(null);
                  setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
                }}
                style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', zIndex: 2000
                }}
              >
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: cardBg,
                    borderRadius: isMobile ? '16px' : '20px',
                    padding: isMobile ? '1.25rem' : '2rem',
                    maxWidth: isMobile ? '95vw' : '500px',
                    width: isMobile ? '95vw' : '90%',
                    animation: 'scaleIn 0.3s ease-out',
                    position: 'relative'
                  }}
                >
                  <button 
                    onClick={() => {
                      setShowEditPantry(false);
                      setEditingPantryItem(null);
                      setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
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

                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.75rem', fontWeight: '700' }}>
                    ✏️ {t('pantry.editItem')}
                  </h3>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Item Name */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        {t('pantry.itemName')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('pantry.itemPlaceholder')}
                        value={newPantryItem.name}
                        onChange={(e) => setNewPantryItem({...newPantryItem, name: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Quantity and Unit */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                          {t('pantry.quantity')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newPantryItem.quantity === '' ? '' : newPantryItem.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewPantryItem(prev => ({ ...prev, quantity: val === '' ? '' as any : parseInt(val) || '' as any }));
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                          {t('pantry.unit')}
                        </label>
                        {/* Smart items: suggested unit dropdown with Other option */}
                        {editingPantryItem.emoji ? (
                          isEditCustomUnit ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <input
                                type="text"
                                placeholder={t('pantry.customUnit')}
                                value={editCustomUnit}
                                autoFocus
                                onChange={(e) => {
                                  setEditCustomUnit(e.target.value);
                                  setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                                }}
                                style={{
                                  flex: 1, padding: '0.75rem', border: '2px solid #8b5cf6',
                                  borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box',
                                }}
                              />
                              <button
                                onClick={() => { setIsEditCustomUnit(false); setEditCustomUnit(''); setNewPantryItem(prev => ({ ...prev, unit: editingPantryItem.unit })); }}
                                style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0 0.75rem', fontSize: '1rem', color: '#6b7280' }}
                              >↩</button>
                            </div>
                          ) : (
                            <select
                              value={newPantryItem.unit}
                              onChange={(e) => {
                                if (e.target.value === '__other__') {
                                  setIsEditCustomUnit(true);
                                  setNewPantryItem(prev => ({ ...prev, unit: '' }));
                                } else {
                                  setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxSizing: 'border-box'
                              }}
                            >
                              {getSuggestedUnits(newPantryItem.unit).map(u => (
                                <option key={u} value={u}>{t(`pantry.units.${u}`, { defaultValue: u })}</option>
                              ))}
                              {/* Also include current unit if not in suggestions */}
                              {!getSuggestedUnits(newPantryItem.unit).includes(newPantryItem.unit) && newPantryItem.unit && (
                                <option value={newPantryItem.unit}>{t(`pantry.units.${newPantryItem.unit}`, { defaultValue: newPantryItem.unit })}</option>
                              )}
                              <option value="__other__">{t('pantry.otherUnit')}</option>
                            </select>
                          )
                        ) : (
                          /* Manual items: standard unit select */
                          <select
                            value={newPantryItem.unit}
                            onChange={(e) => setNewPantryItem({...newPantryItem, unit: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              cursor: 'pointer',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="pc">{t('pantry.units.pieces')}</option>
                            <option value="lbs">{t('pantry.units.lbs')}</option>
                            <option value="kg">{t('pantry.units.kg')}</option>
                            <option value="cups">{t('pantry.units.cups')}</option>
                            <option value="oz">{t('pantry.units.oz')}</option>
                            <option value="g">{t('pantry.units.grams')}</option>
                            <option value="ml">{t('pantry.units.ml') || 'ml'}</option>
                            <option value="liter">{t('pantry.units.liter') || 'L'}</option>
                            <option value="bunch">{t('pantry.units.bunch') || 'bunch'}</option>
                            <option value="bag">{t('pantry.units.bag') || 'bag'}</option>
                            <option value="cans">{t('pantry.units.cans') || 'cans'}</option>
                            <option value="bottle">{t('pantry.units.bottle') || 'bottle'}</option>
                            <option value="jar">{t('pantry.units.jar') || 'jar'}</option>
                            <option value="pack">{t('pantry.units.pack') || 'pack'}</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Category — only for manual items */}
                    {!editingPantryItem.emoji && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                          {t('pantry.category')}
                        </label>
                        <select
                          value={newPantryItem.category}
                          onChange={(e) => setNewPantryItem({...newPantryItem, category: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="produce">🥬 {t('pantry.categories.produce')}</option>
                          <option value="dairy">🥛 {t('pantry.categories.dairy')}</option>
                          <option value="meat">🍖 {t('pantry.categories.meat')}</option>
                          <option value="canned">🥫 {t('pantry.categories.canned')}</option>
                          <option value="grains">🌾 {t('pantry.categories.grains')}</option>
                          <option value="breakfast">🥞 {t('pantry.categories.breakfast')}</option>
                          <option value="other">📦 {t('pantry.categories.other')}</option>
                        </select>
                      </div>
                    )}

                    {/* Expiry Date */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        {t('pantry.expiryDate')}
                      </label>
                      <input
                        type="date"
                        value={newPantryItem.expiryDate}
                        onChange={(e) => setNewPantryItem({...newPantryItem, expiryDate: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button
                      onClick={() => {
                        setShowEditPantry(false);
                        setEditingPantryItem(null);
                        setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
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
                      onClick={handleSaveEditPantryItem}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        background: 'linear-gradient(45deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}
                    >
                      💾 {t('pantry.saveChanges')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showAddPantry && (
              <div style={{ background: '#f9fafb', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>

                {/* ── Two-input row: smart search | or | manual ── */}
                {!selectedFood && (
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? '0.5rem' : '0.75rem',
                  }}>
                    {/* Smart search box — hidden when manual is active */}
                    <div
                      ref={smartSearchRef}
                      style={{
                        position: 'relative',
                        flex: (!isMobile && manualQuery.length > 0) ? 0 : 1,
                        display: (!isMobile && manualQuery.length > 0) ? 'none' : (isMobile && manualQuery.length > 0 ? 'none' : 'block'),
                      }}
                    >
                      <input
                        type="text"
                        placeholder={t('pantry.smartSearch')}
                        value={smartSearchQuery}
                        onChange={(e) => handleSmartSearchChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                          border: '2px solid #8b5cf6',
                          borderRadius: '8px',
                          fontSize: isMobile ? '0.9rem' : '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      {smartSearchQuery.length > 0 && (
                        <button
                          onClick={handleResetSmartSearch}
                          style={{
                            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9ca3af',
                            padding: '0.25rem', lineHeight: 1,
                          }}
                          aria-label={t('common.cancel')}
                        >×</button>
                      )}

                      {/* Dropdown */}
                      {smartSearchResults.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                          background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: '2px', overflow: 'hidden',
                        }}>
                          {smartSearchResults.map((food) => (
                            <button
                              key={food.id}
                              onClick={() => handleSelectFood(food)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                width: '100%', padding: '0.75rem 1rem', background: 'none',
                                border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                                textAlign: 'left', fontSize: '0.95rem', minHeight: '44px',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f3ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                            >
                              <span style={{ fontSize: '1.3rem', width: '1.5rem', textAlign: 'center' }}>{food.emoji}</span>
                              <span style={{ fontWeight: 500 }}>{getFoodDisplayName(food, i18n.language || 'en')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* "or" separator — hidden when either side is active */}
                    {smartSearchQuery.length === 0 && manualQuery.length === 0 && (
                      <span style={{
                        color: '#9ca3af', fontWeight: 500, fontSize: '0.85rem',
                        whiteSpace: 'nowrap', flexShrink: 0,
                        textAlign: isMobile ? 'center' : 'left',
                        padding: isMobile ? '0.1rem 0' : '0',
                      }}>
                        {t('common.or')}
                      </span>
                    )}

                    {/* Manual name box — hidden when smart search is active */}
                    <div style={{
                      flex: smartSearchQuery.length > 0 ? 0 : 1,
                      display: smartSearchQuery.length > 0 ? 'none' : 'block',
                    }}>
                      <input
                        type="text"
                        placeholder={t('pantry.enterManually')}
                        value={manualQuery}
                        onChange={(e) => {
                          setManualQuery(e.target.value);
                          setNewPantryItem(prev => ({ ...prev, name: e.target.value }));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: isMobile ? '0.9rem' : '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Compact card confirm (after food selected from DB) ── */}
                {selectedFood && (
                  <div style={{
                    background: 'white', border: '1.5px solid #8b5cf6', borderRadius: '10px',
                    padding: isMobile ? '0.9rem' : '1rem', boxShadow: '0 2px 8px rgba(139,92,246,0.08)',
                    overflow: 'hidden',
                    minWidth: 0,
                  }}>
                    {/* Header with reset */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '1.5rem' }}>{selectedFood.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{getFoodDisplayName(selectedFood, i18n.language || 'en')}</span>
                      <span style={{ marginLeft: 'auto', background: '#f5f3ff', color: '#7c3aed', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        {t(`pantry.categories.${selectedFood.category}`) || selectedFood.category}
                      </span>
                      <button
                        onClick={handleResetSmartSearch}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#9ca3af', padding: '0.2rem', lineHeight: 1 }}
                        aria-label={t('common.cancel')}
                      >×</button>
                    </div>

                    {/* Quantity + Smart unit row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>
                          {t('pantry.quantity')}
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          placeholder="0"
                          autoFocus
                          value={newPantryItem.quantity === '' ? '' : newPantryItem.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewPantryItem(prev => ({ ...prev, quantity: val === '' ? '' as any : parseFloat(val) || '' as any }));
                          }}
                          style={{
                            width: '100%', padding: '0.6rem', border: '1.5px solid #e5e7eb',
                            borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>
                          {t('pantry.unit')}
                        </label>
                        {isCustomUnit ? (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <input
                              type="text"
                              placeholder={t('pantry.customUnit')}
                              value={customUnitValue}
                              autoFocus
                              onChange={(e) => {
                                setCustomUnitValue(e.target.value);
                                setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                              }}
                              style={{
                                flex: 1, padding: '0.6rem', border: '1.5px solid #8b5cf6',
                                borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box',
                              }}
                            />
                            <button
                              onClick={() => { setIsCustomUnit(false); setCustomUnitValue(''); setNewPantryItem(prev => ({ ...prev, unit: selectedFood.defaultUnit })); }}
                              style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0 0.5rem', fontSize: '0.9rem', color: '#6b7280' }}
                            >↩</button>
                          </div>
                        ) : (
                          <select
                            value={newPantryItem.unit}
                            onChange={(e) => {
                              if (e.target.value === '__other__') {
                                setIsCustomUnit(true);
                                setNewPantryItem(prev => ({ ...prev, unit: '' }));
                              } else {
                                setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                              }
                            }}
                            style={{
                              width: '100%', padding: '0.6rem', border: '1.5px solid #e5e7eb',
                              borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', cursor: 'pointer',
                            }}
                          >
                            {getSuggestedUnits(selectedFood.defaultUnit).map(u => (
                              <option key={u} value={u}>{t(`pantry.units.${u}`, { defaultValue: u })}</option>
                            ))}
                            <option value="__other__">{t('pantry.otherUnit')}</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Smart expiry chip + date picker */}
                    <div style={{ marginBottom: '0.75rem', minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.35rem', fontWeight: 600 }}>
                        {t('pantry.expiryDate')}
                      </label>
                      <button
                        type="button"
                        onClick={handleAcceptSmartExpiry}
                        style={{
                          display: 'block', width: '100%', boxSizing: 'border-box',
                          background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                          borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.82rem',
                          fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem',
                          textAlign: 'left', wordBreak: 'break-word',
                        }}
                      >
                        ✨ {t('pantry.smartExpiry')}: {getSmartExpiryDate(selectedFood)}
                        {' '}<span style={{ color: '#b45309' }}>({t('pantry.smartExpiryDays', { count: selectedFood.shelfLife })})</span>
                      </button>
                      <input
                        type="date"
                        value={newPantryItem.expiryDate}
                        onChange={(e) => setNewPantryItem(prev => ({ ...prev, expiryDate: e.target.value }))}
                        style={{
                          display: 'block', width: '100%', minWidth: 0, padding: '0.6rem',
                          border: '1.5px solid #e5e7eb', borderRadius: '8px',
                          fontSize: '0.95rem', boxSizing: 'border-box',
                        }}
                      />
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
                        {t('pantry.expiryHint')}
                      </p>
                    </div>

                    {/* Add button */}
                    <button
                      disabled={!newPantryItem.quantity || newPantryItem.quantity === ('' as any)}
                      onClick={async () => {
                        if (!newPantryItem.name.trim()) return;
                        const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
                        try {
                          const savedItem = await pantryService.add({
                            name: newPantryItem.name.trim(),
                            quantity,
                            unit: newPantryItem.unit,
                            category: newPantryItem.category,
                            expiryDate: newPantryItem.expiryDate || undefined,
                            emoji: newPantryItem.emoji,
                          });
                          setPantry(prev => [...prev, {
                            id: savedItem.id,
                            name: savedItem.name,
                            quantity: savedItem.quantity,
                            unit: savedItem.unit,
                            category: savedItem.category,
                            expiryDate: savedItem.expiry_date || undefined,
                            emoji: savedItem.emoji || undefined,
                          }]);
                          handleResetSmartSearch();
                          setShowAddPantry(false);
                          onSuccess(t('toasts.itemAddedToPantry'));
                        } catch (error) {
                          console.error('Error adding pantry item:', error);
                          onWarning(t('toasts.failedAddItem'));
                        }
                      }}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: (!newPantryItem.quantity || newPantryItem.quantity === ('' as any)) ? '#e5e7eb' : 'linear-gradient(45deg,#8b5cf6,#6d28d9)',
                        color: (!newPantryItem.quantity || newPantryItem.quantity === ('' as any)) ? '#9ca3af' : 'white',
                        border: 'none', borderRadius: '8px',
                        cursor: (!newPantryItem.quantity || newPantryItem.quantity === ('' as any)) ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: '1rem',
                      }}
                    >
                      {(!newPantryItem.quantity || newPantryItem.quantity === ('' as any))
                        ? t('pantry.quantityRequired')
                        : t('pantry.addToPantry')}
                    </button>
                  </div>
                )}

                {/* ── Manual form fields (when user typed in manual box) ── */}
                {!selectedFood && manualQuery.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.quantity')}</label>
                        <input
                          type="number" min="1" placeholder="1"
                          value={newPantryItem.quantity}
                          onChange={(e) => setNewPantryItem({...newPantryItem, quantity: parseInt(e.target.value) || 1})}
                          style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.unit')}</label>
                        <select
                          value={newPantryItem.unit}
                          onChange={(e) => setNewPantryItem({...newPantryItem, unit: e.target.value})}
                          style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                        >
                          <option value="pc">{t('pantry.units.pieces')}</option>
                          <option value="kg">{t('pantry.units.kg')}</option>
                          <option value="lbs">{t('pantry.units.lbs')}</option>
                          <option value="g">{t('pantry.units.grams') || 'g'}</option>
                          <option value="oz">{t('pantry.units.oz') || 'oz'}</option>
                          <option value="cups">{t('pantry.units.cups')}</option>
                          <option value="ml">{t('pantry.units.ml') || 'ml'}</option>
                          <option value="liter">{t('pantry.units.liter') || 'L'}</option>
                          <option value="bunch">{t('pantry.units.bunch') || 'bunch'}</option>
                          <option value="bag">{t('pantry.units.bag') || 'bag'}</option>
                          <option value="box">{t('pantry.units.box') || 'box'}</option>
                          <option value="cans">{t('pantry.units.cans') || 'cans'}</option>
                          <option value="bottle">{t('pantry.units.bottle') || 'bottle'}</option>
                          <option value="jar">{t('pantry.units.jar') || 'jar'}</option>
                          <option value="pack">{t('pantry.units.pack') || 'pack'}</option>
                          <option value="loaf">{t('pantry.units.loaf') || 'loaf'}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.category')}</label>
                      <select
                        value={newPantryItem.category}
                        onChange={(e) => setNewPantryItem({...newPantryItem, category: e.target.value})}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                      >
                        <option value="produce">🥬 {t('pantry.categories.produce')}</option>
                        <option value="dairy">🥛 {t('pantry.categories.dairy')}</option>
                        <option value="meat">🍖 {t('pantry.categories.meat')}</option>
                        <option value="canned">🥫 {t('pantry.categories.canned')}</option>
                        <option value="grains">🌾 {t('pantry.categories.grains')}</option>
                        <option value="breakfast">🥞 {t('pantry.categories.breakfast')}</option>
                        <option value="other">📦 {t('pantry.categories.other')}</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.expiryDate')}</label>
                      <input
                        type="date"
                        value={newPantryItem.expiryDate}
                        onChange={(e) => setNewPantryItem({...newPantryItem, expiryDate: e.target.value})}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!newPantryItem.name.trim()) return;
                        const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
                        try {
                          const savedItem = await pantryService.add({
                            name: newPantryItem.name.trim(), quantity,
                            unit: newPantryItem.unit, category: newPantryItem.category,
                            expiryDate: newPantryItem.expiryDate || undefined,
                          });
                          setPantry(prev => [...prev, {
                            id: savedItem.id, name: savedItem.name, quantity: savedItem.quantity,
                            unit: savedItem.unit, category: savedItem.category,
                            expiryDate: savedItem.expiry_date || undefined,
                          }]);
                          handleResetSmartSearch();
                          setShowAddPantry(false);
                          onSuccess(t('toasts.itemAddedToPantry'));
                        } catch (error) {
                          console.error('Error adding pantry item:', error);
                          onWarning(t('toasts.failedAddItem'));
                        }
                      }}
                      style={{ padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      {t('pantry.addToPantry')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div data-tour="pantry-expiry-input" style={{ display: 'grid', gap: '0.75rem' }}>
              {pantry.map(item => {
                const expiring = getExpiringItems().some(e => e.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`card-hover pantry-item-row${isExpiringSoon(item) ? ' expiring-soon' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'stretch' : 'center',
                      padding: isMobile ? '0.75rem' : '1rem',
                      background: expiring ? '#fee2e2' : '#f9fafb',
                      border: `1px solid ${expiring ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      gap: isMobile ? '0.75rem' : '0'
                    }}
                  >
                    <div
                      className="item-content"
                      style={{ flex: 1 }}
                      onClick={isMobile ? () => handleEditPantryItem(item) : undefined}
                      role={isMobile ? 'button' : undefined}
                      tabIndex={isMobile ? 0 : undefined}
                      onKeyDown={isMobile ? (e) => e.key === 'Enter' && handleEditPantryItem(item) : undefined}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '0.5rem' : '0.75rem'
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          {item.emoji ?? (
                            item.category === 'produce' ? '🥬' :
                            item.category === 'dairy' ? '🥛' :
                            item.category === 'meat' ? '🍖' :
                            item.category === 'canned' ? '🥫' :
                            item.category === 'grains' ? '🌾' :
                            item.category === 'breakfast' ? '🥞' : '📦'
                          )}
                        </div>
                        <div>
                          <span className="item-name" style={{ fontWeight: '600', fontSize: '1.05rem', color: '#1f2937' }}>
                            {item.name}
                          </span>
                          <div className="item-meta" style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {item.quantity} {item.unit}
                            {item.expiryDate && (
                              <span style={{
                                marginLeft: '0.5rem',
                                color: expiring ? '#dc2626' : '#6b7280',
                                fontWeight: expiring ? '600' : '400'
                              }}>
                                {expiring && '⚠️ '}
                                Expires: {new Date(item.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      <button
                        className="item-edit-btn"
                        onClick={() => handleEditPantryItem(item)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          flex: isMobile ? '1' : 'initial'
                        }}
                      >
                        ✏️ {isMobile ? '' : t('common.edit')}
                      </button>
                      <button
                          className="item-delete-btn"
                          onClick={async () => {
                            try {
                              // Check if this is a local-only item (scanned items have timestamp-based IDs)
                              const isLocalItem = item.id.includes('-') && item.id.includes('.');

                              if (user && !isLocalItem) {
                                // Only try database delete for items that came from database
                                await pantryService.delete(item.id);
                              }

                              // Always remove from local state
                              setPantry(prev => prev.filter(i => i.id !== item.id));
                              onSuccess(t('toasts.itemRemoved'));
                            } catch (error) {
                              console.error('Error deleting pantry item:', error);
                              // Still remove from local state even if database delete fails
                              setPantry(prev => prev.filter(i => i.id !== item.id));
                              onSuccess(t('toasts.itemRemoved'));
                            }
                          }}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          flex: isMobile ? '1' : 'initial'
                        }}
                      >
                        {isMobile ? '🗑️' : t('common.delete')}
                      </button>
                    </div>
                  </div>
                );
              })}
              {pantry.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: mutedText }}>
                  <div style={{ fontSize: '3rem' }}>📦</div>
                  <p>{t('pantry.emptyPantry')}</p>
                </div>
              )}
              {pantryHasMore && (
                <button
                  onClick={loadMorePantry}
                  disabled={pantryLoadingMore}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: pantryLoadingMore ? 'default' : 'pointer',
                    fontWeight: '600',
                    opacity: pantryLoadingMore ? 0.7 : 1
                  }}
                >
                  {pantryLoadingMore ? t('common.loading') : t('common.loadMore')}
                </button>
              )}
            </div>
          </div>
  );
}
