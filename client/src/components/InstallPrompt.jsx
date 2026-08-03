import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';

export default function InstallPrompt() {
  const { user } = useAuthStore();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt || user) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#1e293b',
      color: '#ffffff',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '320px',
      fontFamily: 'sans-serif',
      border: '1px solid #334155'
    }}>
      <div style={{ fontSize: '15px', fontWeight: '500', lineHeight: '1.4' }}>
        সহজে ব্যবহার করতে এই ওয়েবসাইটটি অ্যাপ হিসেবে ইনস্টল করুন।
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setShowPrompt(false)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#94a3b8', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          পরে
        </button>
        <button 
          onClick={handleInstallClick}
          style={{ 
            backgroundColor: '#3b82f6', 
            border: 'none', 
            color: '#ffffff', 
            padding: '8px 16px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          ইনস্টল করুন
        </button>
      </div>
    </div>
  );
}
