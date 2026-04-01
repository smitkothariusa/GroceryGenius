import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService, supabase } from '../lib/supabase';
import AttractButton from './AttractButton';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      const queryParams = new URLSearchParams(window.location.search);
      const tokenHash = queryParams.get('token_hash');
      const queryType = queryParams.get('type');

      if (accessToken && type === 'signup') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) onAuthSuccess();
        return;
      }

      if (tokenHash && queryType === 'email') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
          if (error) {
            setError(t('auth.emailConfirmFailed'));
          } else if (data.session) {
            onAuthSuccess();
          }
        } catch {
          setError(t('auth.emailConfirmFailed'));
        }
      }
    };

    handleEmailConfirmation();
  }, [onAuthSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await authService.signUp(email, password, fullName);
        if (error) throw error;
        alert(t('auth.checkEmail'));
      } else {
        const { error } = await authService.signIn(email, password);
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#fafaf8',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f7f4ef 0%, #ede8df 60%, #e8ddd0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background circles */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(237,139,0,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-60px',
        width: '260px', height: '260px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,154,1,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          padding: '2.75rem 2.5rem',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(237,139,0,0.08)',
          border: '1px solid rgba(237,139,0,0.12)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.75rem', marginBottom: '0.75rem', lineHeight: 1 }}>👨‍🍳</div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: '800',
              fontSize: '1.9rem',
              background: 'linear-gradient(135deg, #ED8B00, #789A01)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            GroceryGenius
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            {t('auth.aiPoweredMealPlanning')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                {t('auth.fullName')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#ED8B00')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#ED8B00')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#ED8B00')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                borderLeft: '3px solid #dc2626',
              }}
            >
              {error}
            </div>
          )}

          <AttractButton type="submit" loading={loading} disabled={loading} style={{ marginBottom: '1rem' }}>
            {loading ? t('auth.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
          </AttractButton>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              color: '#6b7280',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
            }}
          >
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
