'use client';
import { useEffect, useRef, useCallback } from 'react';

// Convierte la clave VAPID base64 al formato que necesita el navegador
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((r) => r.startsWith('kasa_auth_token='));
  return row ? row.split('=')[1] : null;
}

/**
 * Hook que registra el Service Worker, solicita permiso de notificaciones
 * y envía la suscripción al backend.
 *
 * Uso: llamar `usePushNotifications()` en cualquier componente que deba
 * activar las push (GlobalOrderReadyAlert para usuarios, AdminNotifications para admins).
 */
export function usePushNotifications() {
  const subscribedRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (subscribedRef.current) return; // Ya suscrito en esta sesión
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Este navegador no soporta Web Push.');
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    const token = getToken();
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    if (!vapidKey || !token) return;

    try {
      // 1. Registrar el Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 2. Pedir permiso (solo muestra el diálogo la primera vez)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[Push] Permiso denegado por el usuario.');
        return;
      }

      // 3. Suscribirse al servidor de push del navegador
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      // 4. Extraer las claves en base64
      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!p256dh || !auth) {
        console.error('[Push] No se pudieron extraer las claves de la suscripción.');
        return;
      }

      // 5. Enviar suscripción al backend
      const res = await fetch(`${API}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        }),
      });

      if (res.ok) {
        console.log('[Push] ✅ Suscripción registrada correctamente.');
        subscribedRef.current = true;
      } else {
        console.error('[Push] Error al registrar suscripción:', await res.text());
      }
    } catch (err) {
      console.error('[Push] Error en el proceso de suscripción:', err);
    }
  }, []);

  useEffect(() => {
    // Intentar suscribir automáticamente al montar el componente
    subscribe();
  }, [subscribe]);

  return { subscribe };
}
