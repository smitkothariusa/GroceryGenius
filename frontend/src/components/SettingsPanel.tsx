import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Profile, CustomDietaryLabel, profileService, authService, supabase } from '../lib/supabase';

function calcRecommendedCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female',
  activity: Profile['activity_level']
): number {
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activity ?? 'moderate'] ?? 1.55));
}

function lbsToKg(lbs: number): number { return Math.round(lbs * 0.453592 * 100) / 100; }
function kgToLbs(kg: number): number { return Math.round(kg * 2.20462 * 10) / 10; }
function ftInToCm(ft: number, inches: number): number { return Math.round(ft * 30.48 + inches * 2.54); }
function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  return { ft: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

const PRESET_DIETARY_KEYS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'halal', 'kosher', 'keto', 'low-carb', 'nut-free', 'paleo',
];

interface SettingsPanelProps {
  userId: string;
  profile: Profile;
  apiBase: string;
  isMobile: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Profile>) => void;
  onDeleteAccount: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  onSignOut?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  userId, profile, apiBase, isMobile, onClose, onSave,
  onDeleteAccount, showSuccess, showError,
}) => {
  const { t } = useTranslation();

  const [cookingLevel, setCookingLevel] = useState<Profile['cooking_level'] | ''>(profile.cooking_level ?? '');
  const [age, setAge] = useState(String(profile.age ?? ''));
  const [sex, setSex] = useState<Profile['biological_sex']>(profile.biological_sex);
  const [weightValue, setWeightValue] = useState(profile.weight_kg ? String(kgToLbs(profile.weight_kg)) : '');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [heightFt, setHeightFt] = useState(() => {
    if (!profile.height_cm) return '';
    return String(cmToFtIn(profile.height_cm).ft);
  });
  const [heightIn, setHeightIn] = useState(() => {
    if (!profile.height_cm) return '';
    return String(cmToFtIn(profile.height_cm).inches);
  });
  const [heightCm, setHeightCm] = useState(String(profile.height_cm ?? ''));
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>('ft');
  const [activityLevel, setActivityLevel] = useState<Profile['activity_level']>(profile.activity_level ?? 'moderate');
  const [calorieGoal, setCalorieGoal] = useState(String(profile.daily_calorie_goal ?? 2000));
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>(profile.dietary_preferences ?? []);
  const [customLabels, setCustomLabels] = useState<CustomDietaryLabel[]>(profile.custom_dietary_labels ?? []);
  const [customDietText, setCustomDietText] = useState('');
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const rec = useMemo((): number | null => {
    const ageNum = parseInt(age);
    if (!ageNum || !sex) return null;
    let kg: number;
    if (weightUnit === 'lbs') {
      const lbs = parseFloat(weightValue);
      if (!lbs) return null;
      kg = lbsToKg(lbs);
    } else {
      kg = parseFloat(weightValue);
      if (!kg) return null;
    }
    let cm: number;
    if (heightUnit === 'ft') {
      const ft = parseInt(heightFt);
      if (!ft) return null;
      cm = ftInToCm(ft, parseInt(heightIn) || 0);
    } else {
      cm = parseInt(heightCm);
      if (!cm) return null;
    }
    return calcRecommendedCalories(kg, cm, ageNum, sex, activityLevel);
  }, [age, sex, weightValue, weightUnit, heightFt, heightIn, heightCm, heightUnit, activityLevel]);

  const toggleDietaryPreset = (key: string) => {
    setDietaryPrefs(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const removeCustomLabel = (id: string) => {
    setCustomLabels(prev => prev.filter(l => l.id !== id));
    setDietaryPrefs(prev => prev.filter(k => k !== id));
  };

  const handleAddCustomDiet = async () => {
    const text = customDietText.trim();
    if (!text) return;
    setGeneratingLabel(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${apiBase}/profile/dietary-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('server error');
      const labelData = await res.json();
      const newLabel: CustomDietaryLabel = { id: uuidv4(), label: labelData.label, description: labelData.description };
      setCustomLabels(prev => [...prev, newLabel]);
      setDietaryPrefs(prev => [...prev, newLabel.id]);
      setCustomDietText('');
    } catch {
      showError(t('settings.failedToGenerateLabel'));
      const fallback: CustomDietaryLabel = { id: uuidv4(), label: text.slice(0, 30), description: '' };
      setCustomLabels(prev => [...prev, fallback]);
      setDietaryPrefs(prev => [...prev, fallback.id]);
      setCustomDietText('');
    } finally {
      setGeneratingLabel(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let weight_kg: number | undefined;
    if (weightUnit === 'lbs') {
      const lbs = parseFloat(weightValue);
      if (lbs) weight_kg = lbsToKg(lbs);
    } else {
      weight_kg = parseFloat(weightValue) || undefined;
    }
    let height_cm: number | undefined;
    if (heightUnit === 'ft') {
      const ft = parseInt(heightFt);
      if (ft) height_cm = ftInToCm(ft, parseInt(heightIn) || 0);
    } else {
      height_cm = parseInt(heightCm) || undefined;
    }

    const updates: Partial<Profile> = {
      cooking_level: cookingLevel || undefined,
      age: parseInt(age) || undefined,
      biological_sex: sex,
      weight_kg,
      height_cm,
      activity_level: activityLevel,
      daily_calorie_goal: parseInt(calorieGoal) || 2000,
      dietary_preferences: dietaryPrefs,
      custom_dietary_labels: customLabels,
    };
    const { error } = await profileService.upsertProfile(userId, updates);
    setSaving(false);
    if (error) {
      showError(t('settings.failedToSave'));
    } else {
      showSuccess(t('settings.saved'));
      onSave(updates);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showError(t('settings.passwordMismatch'));
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(t('settings.passwordChanged'));
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${apiBase}/profile/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Delete failed');
      await authService.signOut();
      onDeleteAccount();
    } catch {
      showError(t('settings.failedToDelete'));
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.6rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9ca3af',
    marginBottom: '0.5rem',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '0.75rem',
    borderBottom: '1px solid #f3f4f6',
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const panelContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem',
        borderRadius: isMobile ? '16px 16px 0 0' : '0',
        flexShrink: 0,
      }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px' }} />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>⚙️ {t('settings.title')}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer', opacity: 0.8 }}>✕</button>
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.25rem' }}>
          {profile.full_name} · {profile.email}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Profile section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>👤 {t('settings.sections.profile')}</div>
          <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('settings.cookingLevel')}</label>
          <select value={cookingLevel} onChange={e => setCookingLevel(e.target.value as Profile['cooking_level'] | '')} style={inputStyle}>
            <option value="">—</option>
            {(['beginner','home_cook','intermediate','advanced'] as const).map(level => (
              <option key={level} value={level}>{t(`survey.cookingLevels.${level}`)}</option>
            ))}
          </select>
        </div>

        {/* Physical info section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>🏃 {t('settings.sections.physical')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.age')}</label>
              <input type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.sex')}</label>
              <select value={sex ?? ''} onChange={e => setSex(e.target.value as Profile['biological_sex'])} style={inputStyle}>
                <option value="">—</option>
                <option value="male">{t('survey.fields.male')}</option>
                <option value="female">{t('survey.fields.female')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.weight')}</label>
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <input type="number" value={weightValue} onChange={e => setWeightValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => setWeightUnit(u => u === 'lbs' ? 'kg' : 'lbs')} style={{ padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}>{weightUnit}</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.height')}</label>
              {heightUnit === 'ft' ? (
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="5" />
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="8" />
                  <button onClick={() => setHeightUnit('cm')} style={{ padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}>ft</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="175" />
                  <button onClick={() => setHeightUnit('ft')} style={{ padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}>cm</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.activityLevel')}</label>
            <select value={activityLevel ?? 'moderate'} onChange={e => setActivityLevel(e.target.value as Profile['activity_level'])} style={inputStyle}>
              {(['sedentary','light','moderate','active','very_active'] as const).map(level => (
                <option key={level} value={level}>{t(`survey.activityLevels.${level}`)}</option>
              ))}
            </select>
          </div>
          {rec && (
            <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>
              {t('settings.recommendedCalories', { calories: rec.toLocaleString() })}
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('settings.dailyCalorieGoal')}</label>
            <input type="number" value={calorieGoal} onChange={e => setCalorieGoal(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Dietary preferences section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>🥗 {t('settings.sections.dietary')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {PRESET_DIETARY_KEYS.map(key => {
              const selected = dietaryPrefs.includes(key);
              return (
                <button key={key} onClick={() => toggleDietaryPreset(key)} style={{
                  padding: '0.3rem 0.6rem',
                  border: selected ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: selected ? '#f5f3ff' : 'white',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: selected ? '700' : '400',
                  fontSize: '0.8rem',
                }}>
                  {selected ? '✓ ' : ''}{t(`survey.dietaryPresets.${key}`)}
                </button>
              );
            })}
            {customLabels.map(custom => {
              const selected = dietaryPrefs.includes(custom.id);
              return (
                <div key={custom.id} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button onClick={() => toggleDietaryPreset(custom.id)} style={{
                    padding: '0.3rem 0.6rem',
                    border: selected ? '2px solid #10b981' : '1px solid #e5e7eb',
                    background: selected ? '#f0fdf4' : 'white',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontWeight: selected ? '700' : '400',
                    fontSize: '0.8rem',
                  }}>
                    ✨ {custom.label}
                  </button>
                  <button onClick={() => removeCustomLabel(custom.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem', padding: '0.1rem' }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              value={customDietText}
              onChange={e => setCustomDietText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustomDiet()}
              placeholder={t('settings.customDietPlaceholder')}
              style={{ ...inputStyle, flex: 1 }}
              disabled={generatingLabel}
            />
            <button
              onClick={handleAddCustomDiet}
              disabled={generatingLabel || !customDietText.trim()}
              style={{ padding: '0.4rem 0.6rem', background: 'linear-gradient(45deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', opacity: generatingLabel || !customDietText.trim() ? 0.6 : 1 }}
            >
              {generatingLabel ? t('settings.aiGeneratingLabel') : '+'}
            </button>
          </div>
        </div>

        {/* Security section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>🔒 {t('settings.sections.security')}</div>
          <button
            onClick={() => setShowPasswordForm(v => !v)}
            style={{ width: '100%', padding: '0.5rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' }}
          >
            {t('settings.changePassword')} {showPasswordForm ? '▲' : '→'}
          </button>
          {showPasswordForm && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} style={inputStyle} minLength={6} />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmPassword')} style={inputStyle} minLength={6} />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                style={{ padding: '0.5rem', background: 'linear-gradient(45deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', opacity: changingPassword ? 0.6 : 1 }}
              >
                {changingPassword ? '…' : t('settings.changePassword')}
              </button>
            </div>
          )}
        </div>

        {/* Danger zone section */}
        <div style={{ padding: '0.75rem' }}>
          <div style={{ ...sectionHeaderStyle, color: '#ef4444' }}>⚠️ {t('settings.sections.danger')}</div>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ width: '100%', padding: '0.5rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.875rem', color: '#dc2626', cursor: 'pointer', textAlign: 'left' }}
          >
            {t('settings.deleteAccount')}
          </button>
        </div>
      </div>

      {/* Save button */}
      <div style={{ padding: '0.75rem', borderTop: '2px solid #f3f4f6', flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: '0.75rem', background: saving ? '#9ca3af' : 'linear-gradient(45deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? '…' : t('settings.saveChanges')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 id="delete-modal-title" style={{ margin: '0 0 0.75rem', color: '#dc2626' }}>{t('settings.deleteConfirmTitle')}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>{t('settings.deleteConfirmBody')}</p>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '0.5rem' }}>{t('settings.deleteTypeConfirm')}</label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={t('settings.deleteConfirmPlaceholder')}
              style={{ width: '100%', padding: '0.6rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                style={{ flex: 1, padding: '0.6rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                {t('settings.deleteCancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{ flex: 1, padding: '0.6rem', background: deleteConfirmText === 'DELETE' ? '#dc2626' : '#e5e7eb', color: deleteConfirmText === 'DELETE' ? 'white' : '#9ca3af', border: 'none', borderRadius: '8px', cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed', fontWeight: '700' }}
              >
                {deleting ? '…' : t('settings.deleteConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: right-side drawer */}
      {!isMobile && (
        <div onClick={handleBackdropClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px', background: 'white', height: '100%', boxShadow: '-4px 0 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            {panelContent}
          </div>
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <div onClick={handleBackdropClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '16px 16px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 24px rgba(0,0,0,0.18)' }}>
            {panelContent}
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
