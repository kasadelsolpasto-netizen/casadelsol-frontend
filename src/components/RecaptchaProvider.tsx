"use client";
import { useEffect } from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const siteKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🛡️ [reCAPTCHA-INIT] Testing site key:', siteKey ? `${siteKey.substring(0, 6)}...` : 'MISSING');
      
      const checkScript = () => {
        const scripts = Array.from(document.getElementsByTagName('script'));
        const hasRecaptcha = scripts.some(s => s.src.includes('recaptcha'));
        console.log('🛡️ [reCAPTCHA-INIT] Script present in DOM:', hasRecaptcha);
      };

      // Check after a short delay to allow for mounting
      const timer = setTimeout(checkScript, 2000);
      return () => clearTimeout(timer);
    }
  }, [siteKey]);

  return (
    <GoogleReCaptchaProvider 
      reCaptchaKey={siteKey}
      language="es"
      useRecaptchaNet
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
