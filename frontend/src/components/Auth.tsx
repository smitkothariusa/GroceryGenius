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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Check for email confirmation token in URL
// Handle email confirmation from URL
useEffect(() => {
  const handleEmailConfirmation = async () => {
    // Check URL hash params (format: #access_token=...)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // Check URL query params (format: ?token_hash=...)
    const queryParams = new URLSearchParams(window.location.search);
    const tokenHash = queryParams.get('token_hash');
    const queryType = queryParams.get('type');

    // If we have an access token in the hash, user is already authenticated
    if (accessToken && type === 'signup') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        onAuthSuccess();
      }
      return;
    }

    // If we have a token_hash in the query, we need to verify it
    if (tokenHash && queryType === 'email') {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email'
        });
        
        if (error) {
          console.error('Verification error:', error);
          setError(t('auth.emailConfirmFailed'));
        } else if (data.session) {
          console.log('Email verified successfully!');
          onAuthSuccess();
        }
      } catch (err) {
        console.error('Verification exception:', err);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gg-parchment)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="auth-card" style={{
        background: 'var(--gg-cream)',
        borderRadius: 'var(--gg-radius-xl)',
        padding: '3rem',
        maxWidth: '450px',
        width: '100%',
        boxShadow: 'var(--gg-shadow-lg)',
        border: '1.5px solid var(--gg-border)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍🍳</div>
          <h1 style={{ margin: 0, color: 'var(--gg-espresso)', fontSize: '2.5rem', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, letterSpacing: '-1px' }}>GroceryGenius</h1>
          <p style={{ color: 'var(--gg-taupe)', marginTop: '0.5rem', fontFamily: "'Lato', sans-serif" }}>
            {t('auth.aiPoweredMealPlanning')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '0.8rem', color: 'var(--gg-espresso)' }}>
                {t('auth.fullName')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                onFocus={() => setFocusedInput('fullname')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: focusedInput === 'fullname' ? '1.5px solid var(--gg-tomato)' : '1.5px solid var(--gg-border)',
                  borderRadius: 'var(--gg-radius-md)',
                  fontSize: '16px',
                  fontFamily: "'Lato', sans-serif",
                  background: 'var(--gg-cream)',
                  color: 'var(--gg-espresso)',
                  boxSizing: 'border-box' as const,
                  outline: 'none',
                  minHeight: '48px',
                  boxShadow: focusedInput === 'fullname' ? '0 0 0 3px var(--gg-tomato-subtle)' : 'none',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '0.8rem', color: 'var(--gg-espresso)' }}>
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: focusedInput === 'email' ? '1.5px solid var(--gg-tomato)' : '1.5px solid var(--gg-border)',
                borderRadius: 'var(--gg-radius-md)',
                fontSize: '16px',
                fontFamily: "'Lato', sans-serif",
                background: 'var(--gg-cream)',
                color: 'var(--gg-espresso)',
                boxSizing: 'border-box' as const,
                outline: 'none',
                minHeight: '48px',
                boxShadow: focusedInput === 'email' ? '0 0 0 3px var(--gg-tomato-subtle)' : 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '0.8rem', color: 'var(--gg-espresso)' }}>
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: focusedInput === 'password' ? '1.5px solid var(--gg-tomato)' : '1.5px solid var(--gg-border)',
                borderRadius: 'var(--gg-radius-md)',
                fontSize: '16px',
                fontFamily: "'Lato', sans-serif",
                background: 'var(--gg-cream)',
                color: 'var(--gg-espresso)',
                boxSizing: 'border-box' as const,
                outline: 'none',
                minHeight: '48px',
                boxShadow: focusedInput === 'password' ? '0 0 0 3px var(--gg-tomato-subtle)' : 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--gg-red-light)',
              color: 'var(--gg-red)',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <AttractButton
            type="submit"
            disabled={loading}
            loading={loading}
            style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
          >
            {isSignUp ? t('auth.signUp') : t('auth.signIn')}
          </AttractButton>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              color: 'var(--gg-tomato)',
              border: 'none',
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.875rem'
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