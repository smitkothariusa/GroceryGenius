import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Profile, CustomDietaryLabel } from '../lib/supabase';

// Calorie calculation: Mifflin-St Jeor + TDEE multiplier
function calcRecommendedCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female' | 'other',
  activity: Profile['activity_level']
): number {
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : sex === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 78; // 'other': average of male/female
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activity ?? 'moderate'] ?? 1.55));
}

function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 100) / 100;
}

function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 30.48) + (inches * 2.54));
}

const PRESET_DIETARY_KEYS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'halal', 'kosher', 'keto', 'low-carb', 'nut-free', 'paleo',
];

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

interface SurveyData {
  cooking_level: Profile['cooking_level'];
  age: string;
  biological_sex: 'male' | 'female' | 'other' | undefined;
  weightValue: string;
  weightUnit: 'lbs' | 'kg';
  heightFt: string;
  heightIn: string;
  heightCm: string;
  heightUnit: 'ft' | 'cm';
  activity_level: Profile['activity_level'];
  daily_calorie_goal: number;
  dietary_preferences: string[];
  custom_dietary_labels: CustomDietaryLabel[];
}

interface OnboardingSurveyProps {
  userId: string;
  apiBase: string;
  onComplete: (data: Partial<Profile>) => void;
  onSkip: () => void;
}

const OnboardingSurvey: React.FC<OnboardingSurveyProps> = ({
  userId,
  apiBase,
  onComplete,
  onSkip,
}) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0); // 0 = welcome
  const [customDietText, setCustomDietText] = useState('');
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [calorieMode, setCalorieMode] = useState<'recommended' | 'manual'>('recommended');

  const [data, setData] = useState<SurveyData>({
    cooking_level: undefined,
    age: '',
    biological_sex: undefined,
    weightValue: '',
    weightUnit: 'lbs',
    heightFt: '',
    heightIn: '',
    heightCm: '',
    heightUnit: 'ft',
    activity_level: 'moderate',
    daily_calorie_goal: 2000,
    dietary_preferences: [],
    custom_dietary_labels: [],
  });

  const recommendedCalories = useCallback((): number | null => {
    const age = parseInt(data.age);
    const sex = data.biological_sex;
    if (!age || !sex) return null;

    let kg: number;
    if (data.weightUnit === 'lbs') {
      const lbs = parseFloat(data.weightValue);
      if (!lbs) return null;
      kg = lbsToKg(lbs);
    } else {
      kg = parseFloat(data.weightValue);
      if (!kg) return null;
    }

    let cm: number;
    if (data.heightUnit === 'ft') {
      const ft = parseInt(data.heightFt);
      const inches = parseInt(data.heightIn) || 0;
      if (!ft) return null;
      cm = ftInToCm(ft, inches);
    } else {
      cm = parseInt(data.heightCm);
      if (!cm) return null;
    }

    return calcRecommendedCalories(kg, cm, age, sex, data.activity_level);
  }, [data]);

  const toggleDietaryPreset = (key: string) => {
    setData(prev => ({
      ...prev,
      dietary_preferences: prev.dietary_preferences.includes(key)
        ? prev.dietary_preferences.filter(k => k !== key)
        : [...prev.dietary_preferences, key],
    }));
  };

  const handleAddCustomDiet = async () => {
    const text = customDietText.trim();
    if (!text) return;
    setGeneratingLabel(true);
    try {
      const res = await fetch(`${apiBase}/profile/dietary-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const labelData = await res.json();
      const newLabel: CustomDietaryLabel = {
        id: uuidv4(),
        label: labelData.label,
        description: labelData.description,
      };
      setData(prev => ({
        ...prev,
        custom_dietary_labels: [...prev.custom_dietary_labels, newLabel],
        dietary_preferences: [...prev.dietary_preferences, newLabel.id],
      }));
      setCustomDietText('');
    } finally {
      setGeneratingLabel(false);
    }
  };

  const handleFinish = () => {
    const rec = recommendedCalories();
    let weight_kg: number | undefined;
    if (data.weightUnit === 'lbs') {
      const lbs = parseFloat(data.weightValue);
      if (lbs) weight_kg = lbsToKg(lbs);
    } else {
      weight_kg = parseFloat(data.weightValue) || undefined;
    }

    let height_cm: number | undefined;
    if (data.heightUnit === 'ft') {
      const ft = parseInt(data.heightFt);
      if (ft) height_cm = ftInToCm(ft, parseInt(data.heightIn) || 0);
    } else {
      height_cm = parseInt(data.heightCm) || undefined;
    }

    onComplete({
      cooking_level: data.cooking_level,
      age: parseInt(data.age) || undefined,
      biological_sex: data.biological_sex,
      weight_kg,
      height_cm,
      activity_level: data.activity_level,
      daily_calorie_goal: calorieMode === 'recommended' && rec ? rec : (data.daily_calorie_goal || rec || 2000),
      dietary_preferences: data.dietary_preferences,
      custom_dietary_labels: data.custom_dietary_labels,
      onboarding_completed: true,
    });
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
  };

  const btnGhost: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    background: 'transparent',
    color: '#9ca3af',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#9ca3af',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👨‍🍳</div>
            <h2 style={{ margin: 0, color: '#667eea', fontSize: '1.5rem' }}>{t('survey.title')}</h2>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>{t('survey.subtitle')}</p>
          </div>
          <button style={btnPrimary} onClick={() => setStep(1)}>{t('survey.letsGo')}</button>
          <button style={btnGhost} onClick={onSkip}>{t('survey.skipForNow')}</button>
        </div>
      </div>
    );
  }

  // Step 1: Language
  if (step === 1) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={sectionLabel}>{t('survey.stepOf', { step: 1, total: 4 })}</div>
          <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step1Title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                style={{
                  padding: '0.75rem',
                  border: i18n.language.startsWith(lang.code) ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: i18n.language.startsWith(lang.code) ? '#f5f3ff' : 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: i18n.language.startsWith(lang.code) ? '700' : '400',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                }}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
          <button style={btnPrimary} onClick={() => setStep(2)}>{t('survey.next')}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(0)}>{t('survey.back')}</button>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(2)}>{t('survey.skipStep')}</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Physical Info
  if (step === 2) {
    const rec = recommendedCalories();
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={sectionLabel}>{t('survey.stepOf', { step: 2, total: 4 })}</div>
          <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step2Title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.age')}</label>
              <input
                type="number"
                min="1" max="120"
                value={data.age}
                onChange={e => setData(p => ({ ...p, age: e.target.value }))}
                style={inputStyle}
                placeholder="25"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.gender')}</label>
              <select
                value={data.biological_sex ?? ''}
                onChange={e => setData(p => ({ ...p, biological_sex: e.target.value as 'male' | 'female' | 'other' | undefined }))}
                style={inputStyle}
              >
                <option value="">—</option>
                <option value="male">{t('survey.fields.male')}</option>
                <option value="female">{t('survey.fields.female')}</option>
                <option value="other">{t('survey.fields.other')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.weight')}</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input
                  type="number"
                  min="1"
                  value={data.weightValue}
                  onChange={e => setData(p => ({ ...p, weightValue: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={data.weightUnit === 'lbs' ? '150' : '68'}
                />
                <button
                  onClick={() => setData(p => ({ ...p, weightUnit: p.weightUnit === 'lbs' ? 'kg' : 'lbs' }))}
                  style={{ padding: '0.5rem 0.6rem', border: '2px solid #e5e7eb', borderRadius: '8px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                >
                  {data.weightUnit}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.height')}</label>
              {data.heightUnit === 'ft' ? (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input type="number" min="1" max="8" value={data.heightFt} onChange={e => setData(p => ({ ...p, heightFt: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="5" />
                  <input type="number" min="0" max="11" value={data.heightIn} onChange={e => setData(p => ({ ...p, heightIn: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="8" />
                  <button onClick={() => setData(p => ({ ...p, heightUnit: 'cm' }))} style={{ padding: '0.5rem 0.4rem', border: '2px solid #e5e7eb', borderRadius: '8px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>ft</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input type="number" min="50" max="250" value={data.heightCm} onChange={e => setData(p => ({ ...p, heightCm: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="175" />
                  <button onClick={() => setData(p => ({ ...p, heightUnit: 'ft' }))} style={{ padding: '0.5rem 0.4rem', border: '2px solid #e5e7eb', borderRadius: '8px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>cm</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.activityLevel')}</label>
            <select
              value={data.activity_level ?? 'moderate'}
              onChange={e => setData(p => ({ ...p, activity_level: e.target.value as Profile['activity_level'] }))}
              style={inputStyle}
            >
              {(['sedentary','light','moderate','active','very_active'] as const).map(level => (
                <option key={level} value={level}>{t(`survey.activityLevels.${level}`)}</option>
              ))}
            </select>
          </div>
          {rec && (
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.4rem' }}>{t('survey.fields.dailyCalorieGoal')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button
                  onClick={() => setCalorieMode('recommended')}
                  style={{
                    padding: '0.6rem 0.75rem',
                    border: calorieMode === 'recommended' ? '2px solid #667eea' : '1px solid #e5e7eb',
                    background: calorieMode === 'recommended' ? '#f5f3ff' : 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: calorieMode === 'recommended' ? '700' : '400',
                    color: calorieMode === 'recommended' ? '#667eea' : '#374151',
                  }}
                >
                  {t('survey.recommendedCalories', { calories: rec.toLocaleString() })}
                </button>
                <button
                  onClick={() => setCalorieMode('manual')}
                  style={{
                    padding: '0.6rem 0.75rem',
                    border: calorieMode === 'manual' ? '2px solid #667eea' : '1px solid #e5e7eb',
                    background: calorieMode === 'manual' ? '#f5f3ff' : 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: calorieMode === 'manual' ? '700' : '400',
                    color: calorieMode === 'manual' ? '#667eea' : '#374151',
                  }}
                >
                  {t('survey.enterManually')}
                </button>
                {calorieMode === 'manual' && (
                  <input
                    type="number"
                    value={data.daily_calorie_goal || ''}
                    onChange={e => setData(p => ({ ...p, daily_calorie_goal: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g. 2000"
                    style={{ ...inputStyle, fontSize: '0.875rem' }}
                  />
                )}
              </div>
            </div>
          )}
          <button style={btnPrimary} onClick={() => setStep(3)}>{t('survey.next')}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(1)}>{t('survey.back')}</button>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(3)}>{t('survey.skipStep')}</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Cooking Level
  if (step === 3) {
    const levels = ['beginner', 'home_cook', 'intermediate', 'advanced'] as const;
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={sectionLabel}>{t('survey.stepOf', { step: 3, total: 4 })}</div>
          <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step3Title')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {levels.map(level => (
              <button
                key={level}
                onClick={() => setData(p => ({ ...p, cooking_level: level }))}
                style={{
                  padding: '0.75rem 1rem',
                  border: data.cooking_level === level ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: data.cooking_level === level ? '#f5f3ff' : 'white',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: data.cooking_level === level ? '700' : '400',
                  fontSize: '0.9rem',
                }}
              >
                {t(`survey.cookingLevels.${level}`)}
              </button>
            ))}
          </div>
          <button style={btnPrimary} onClick={() => setStep(4)}>{t('survey.next')}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(2)}>{t('survey.back')}</button>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(4)}>{t('survey.skipStep')}</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Dietary Preferences
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={sectionLabel}>{t('survey.stepOf', { step: 4, total: 4 })}</div>
        <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step4Title')}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {PRESET_DIETARY_KEYS.map(key => {
            const selected = data.dietary_preferences.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleDietaryPreset(key)}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: selected ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: selected ? '#f5f3ff' : 'white',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: selected ? '700' : '400',
                  fontSize: '0.875rem',
                }}
              >
                {selected ? '✓ ' : ''}{t(`survey.dietaryPresets.${key}`)}
              </button>
            );
          })}
          {data.custom_dietary_labels.map(custom => {
            const selected = data.dietary_preferences.includes(custom.id);
            return (
              <button
                key={custom.id}
                onClick={() => toggleDietaryPreset(custom.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: selected ? '2px solid #10b981' : '1px solid #e5e7eb',
                  background: selected ? '#f0fdf4' : 'white',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: selected ? '700' : '400',
                  fontSize: '0.875rem',
                }}
              >
                {selected ? '✓ ' : ''}✨ {custom.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={customDietText}
            onChange={e => setCustomDietText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCustomDiet()}
            placeholder={t('survey.customDietPlaceholder')}
            style={{ ...inputStyle, flex: 1 }}
            disabled={generatingLabel}
          />
          <button
            onClick={handleAddCustomDiet}
            disabled={generatingLabel || !customDietText.trim()}
            style={{
              padding: '0.6rem 0.75rem',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: generatingLabel ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: generatingLabel || !customDietText.trim() ? 0.6 : 1,
            }}
          >
            {generatingLabel ? '…' : '+'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 1rem' }}>{t('survey.aiWillGenerate')}</p>
        <button
          style={{ ...btnPrimary, background: 'linear-gradient(45deg, #10b981, #059669)' }}
          onClick={handleFinish}
        >
          {t('survey.finish')}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(3)}>{t('survey.back')}</button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSurvey;
