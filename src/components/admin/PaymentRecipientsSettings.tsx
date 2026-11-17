"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckCircle,
  CreditCard,
  Link as LinkIcon,
  Lock,
  Plus,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import {
  CREDENTIAL_FIELDS,
  Gateway,
  GATEWAY_LABEL,
  GATEWAY_SUBTITLE,
  GatewayEnvironment,
  PaymentService,
  Recipient,
  Routing,
  canDelete,
  environmentLabel,
  missingLabel,
  recipientSummary,
  routingWarnings,
  selectableRecipients,
} from '@/lib/payment-recipients';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  return document.cookie.split('kasa_auth_token=')[1]?.split(';')[0];
}

interface Snapshot {
  accounts: Recipient[];
  routing: Routing;
  services: PaymentService[];
}

type Message = { ok: boolean; text: string } | null;

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}/admin/settings/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'La operación no se pudo completar.');
  return data;
}

const WEBHOOKS: Record<Gateway, string> = {
  wompi: `${API}/orders/webhook-wompi`,
  bold: `${API}/orders/webhook-bold`,
};

/** Campo de texto del formulario de llaves. */
function KeyField({
  field,
  value,
  saved,
  onChange,
}: {
  field: (typeof CREDENTIAL_FIELDS)['bold'][number];
  value: string;
  saved: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/70 flex items-center gap-2">
        {field.label}
        {field.secret && <Lock className="w-3 h-3 text-red-500" />}
        {!field.required && <span className="text-zinc-600 normal-case tracking-normal">(opcional)</span>}
      </label>
      <input
        type={field.secret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none text-sm transition-all"
        placeholder={saved ? '•••••••• guardada — déjala vacía para conservarla' : field.label}
      />
      <p className="text-[10px] text-zinc-600">{field.hint}</p>
    </div>
  );
}

/** Copiador de la URL del webhook de una pasarela. */
function WebhookRow({ gateway }: { gateway: Gateway }) {
  const url = WEBHOOKS[gateway];
  return (
    <div className="space-y-2 bg-[#1a0f2e]/30 p-4 rounded-lg border border-neon-purple/30">
      <label className="text-[10px] font-black uppercase tracking-widest text-neon-purple">
        URL del webhook de {GATEWAY_LABEL[gateway]}
      </label>
      <div className="flex items-center gap-3">
        <LinkIcon className="w-4 h-4 text-zinc-400 shrink-0" />
        <div className="flex-1 flex items-center bg-black rounded border border-zinc-800 overflow-hidden">
          <span className="text-neon-purple text-xs px-3 font-mono py-2 truncate flex-1 block">{url}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(url)}
            className="bg-zinc-800 text-white font-bold text-[10px] uppercase px-4 py-2.5 hover:bg-zinc-700 transition-colors"
          >
            Copiar
          </button>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500">
        {gateway === 'bold' ? (
          <>
            Pégala en <b>bold.co → Integraciones → Webhooks</b>. En modo pruebas Bold no envía webhooks automáticos: usa
            el botón «Probar el webhook» del recibo, o deja que la página de resultado confirme el pago.
          </>
        ) : (
          <>
            Pégala en <b>comercios.wompi.co → Ajustes → URL de eventos</b>. El pago también se confirma desde la página
            de resultado, así que un webhook perdido no deja la compra sin entregar.
          </>
        )}
      </p>
    </div>
  );
}

/** Formulario de un recaudador: nombre, entorno y llaves de su pasarela. */
function RecipientForm({
  gateway,
  recipient,
  onSaved,
  onCancel,
}: {
  gateway: Gateway;
  recipient?: Recipient;
  onSaved: (snapshot: Snapshot, text: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(recipient?.name || '');
  const [environment, setEnvironment] = useState<GatewayEnvironment>(recipient?.environment || 'sandbox');
  const [credentials, setCredentials] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of CREDENTIAL_FIELDS[gateway]) initial[f.field] = recipient?.publicCredentials?.[f.field] || '';
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data = await call('payment-recipients', {
        method: 'PUT',
        body: JSON.stringify({ id: recipient?.id, name, gateway, environment, credentials }),
      });
      onSaved(data as Snapshot, recipient ? `«${name}» actualizado.` : `«${name}» ya puede cobrar.`);
      if (!recipient) {
        setName('');
        setCredentials(Object.fromEntries(CREDENTIAL_FIELDS[gateway].map((f) => [f.field, ''])));
      }
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Error de conexión.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Nombre del recaudador</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none text-sm transition-all"
            placeholder="Void — Juan Vela / Fundación"
          />
          <p className="text-[10px] text-zinc-600">Así se reconoce quién recibe el dinero en el resto del panel.</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entorno</label>
          <div className="flex gap-3">
            {(['sandbox', 'production'] as GatewayEnvironment[]).map((env) => (
              <label
                key={env}
                className={`flex-1 flex items-center justify-center p-3 border rounded cursor-pointer transition-all ${
                  environment === env
                    ? env === 'production'
                      ? 'bg-neon-green/10 border-neon-green text-neon-green'
                      : 'bg-orange-500/10 border-orange-500 text-orange-400'
                    : 'border-zinc-800 text-zinc-500'
                }`}
              >
                <input
                  type="radio"
                  value={env}
                  checked={environment === env}
                  onChange={() => setEnvironment(env)}
                  className="hidden"
                />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {env === 'production' ? 'Producción (dinero real)' : 'Pruebas'}
                </span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600">
            Las llaves de pruebas y las de producción no se pueden mezclar: {GATEWAY_LABEL[gateway]} rechaza el cobro.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CREDENTIAL_FIELDS[gateway].map((field) => (
          <KeyField
            key={field.field}
            field={field}
            value={credentials[field.field] || ''}
            saved={!!recipient?.savedSecrets?.includes(field.field)}
            onChange={(v) => setCredentials((c) => ({ ...c, [field.field]: v }))}
          />
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-4">
        <p className={`text-xs font-bold uppercase tracking-widest ${message?.ok ? 'text-neon-green' : 'text-red-500'}`}>
          {message?.text}
        </p>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-zinc-300"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-neon-purple text-white px-6 py-3 rounded text-sm font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(191,0,255,0.5)] transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : recipient ? 'Guardar cambios' : 'Crear recaudador'}
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Panel de recaudadores: quién recibe el dinero y qué servicio cobra cada uno.
 * Reemplaza la palanca global anterior (una sola pasarela para todo el sitio).
 */
export default function PaymentRecipientsSettings() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<Gateway | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback((data: any, text?: string) => {
    setSnapshot({ accounts: data.accounts || [], routing: data.routing, services: data.services || [] });
    if (text) setMessage({ ok: true, text });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        apply(await call('payment-recipients'));
      } catch (err: any) {
        setMessage({ ok: false, text: err?.message || 'No se pudo cargar la configuración de pagos.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [apply]);

  const accounts = snapshot?.accounts ?? [];
  const services = snapshot?.services ?? [];
  const routing = snapshot?.routing ?? { default: null, services: {} };
  const selectable = useMemo(() => selectableRecipients(accounts), [accounts]);
  const warnings = useMemo(() => routingWarnings(services, routing, accounts), [services, routing, accounts]);

  const setRouting = async (body: { default?: string | null; services?: Record<string, string | null> }) => {
    setBusy(true);
    setMessage(null);
    try {
      apply(await call('payment-routing', { method: 'PUT', body: JSON.stringify(body) }), 'Quién cobra: actualizado.');
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'No se pudo cambiar quién cobra.' });
    } finally {
      setBusy(false);
    }
  };

  const archive = async (recipient: Recipient) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await call(`payment-recipients/${recipient.id}/archive`, {
        method: 'PUT',
        body: JSON.stringify({ archived: !recipient.archived }),
      });
      apply(data, recipient.archived ? `«${recipient.name}» vuelve a estar disponible.` : `«${recipient.name}» archivado.`);
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'No se pudo archivar.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (recipient: Recipient) => {
    if (!window.confirm(`¿Borrar a «${recipient.name}»? Los pagos ya hechos con esta cuenta siguen registrados.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      apply(await call(`payment-recipients/${recipient.id}`, { method: 'DELETE' }), `«${recipient.name}» borrado.`);
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'No se pudo borrar.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-10 text-center animate-pulse border border-zinc-800 rounded-2xl mb-8">
        <p className="text-neon-purple uppercase font-bold tracking-widest text-sm">Cargando recaudadores...</p>
      </div>
    );
  }

  const recipientSelect = (value: string | null, onPick: (id: string | null) => void, inheritLabel: string) => (
    <select
      value={value ?? ''}
      disabled={busy}
      onChange={(e) => onPick(e.target.value || null)}
      className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white text-sm focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-none transition-all disabled:opacity-50"
    >
      <option value="">{inheritLabel}</option>
      {selectable.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name} — {GATEWAY_LABEL[r.gateway]} ({environmentLabel(r.effectiveEnvironment)})
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-8 mb-8">
      {/* ── Quién cobra cada servicio ── */}
      <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-neon-green">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/40">
            <CreditCard className="w-6 h-6 text-neon-green" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">Quién cobra</h2>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">
              Cada servicio de pago puede cobrarlo un recaudador distinto
            </p>
          </div>
        </div>

        {selectable.length === 0 ? (
          <div className="bg-zinc-900/50 p-4 rounded-lg flex items-start gap-4 border border-zinc-800">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300">
              Todavía no hay ningún recaudador con llaves completas, así que la página no puede cobrar en línea. Crea uno
              más abajo.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neon-green">Por defecto</label>
              {recipientSelect(routing.default, (id) => setRouting({ default: id }), 'Sin definir')}
              <p className="text-[10px] text-zinc-500">
                Cobra todo servicio que no tenga recaudador propio, incluidos los que se agreguen después.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-zinc-800">
              {services.map((service) => (
                <div key={service.key} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    {service.label}
                  </label>
                  {recipientSelect(
                    routing.services?.[service.key] ?? null,
                    (id) => setRouting({ services: { [service.key]: id } }),
                    'Hereda el de por defecto',
                  )}
                  {service.description && <p className="text-[10px] text-zinc-600">{service.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-6 space-y-2">
            {warnings.map((w) => (
              <p key={w.service} className="text-xs text-orange-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {w.text}
              </p>
            ))}
          </div>
        )}

        {message && (
          <p
            className={`text-xs font-bold uppercase tracking-widest mt-6 ${
              message.ok ? 'text-neon-green' : 'text-red-500'
            }`}
          >
            {message.text}
          </p>
        )}

        <p className="text-[10px] text-zinc-500 mt-4">
          El cambio aplica a los pagos nuevos. Cada orden guarda con qué recaudador se inició, así que los pagos en
          curso se confirman con ese mismo, aunque aquí se cambie la asignación.
        </p>
      </div>

      {/* ── Recaudadores ── */}
      <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-neon-purple">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center border border-neon-purple/50">
            <Users className="w-6 h-6 text-neon-purple" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">Recaudadores</h2>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">
              Cuentas que reciben el dinero, con su pasarela y sus llaves
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {accounts.length === 0 && (
            <p className="text-xs text-zinc-500">Todavía no hay recaudadores. Agrega el primero más abajo.</p>
          )}

          {accounts.map((recipient) => {
            const isEditing = editing === recipient.id;
            const collects = services.filter(
              (s) => (routing.services?.[s.key] ?? routing.default) === recipient.id,
            );
            return (
              <div
                key={recipient.id}
                className={`rounded-xl border p-5 transition-all ${
                  recipient.archived
                    ? 'border-zinc-900 bg-black/20 opacity-70'
                    : recipient.usable
                      ? 'border-zinc-800 bg-black/40'
                      : 'border-orange-500/40 bg-orange-500/5'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black uppercase tracking-widest text-white">{recipient.name}</span>
                      {recipient.usable && !recipient.archived && <CheckCircle className="w-4 h-4 text-neon-green" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
                      {recipientSummary(recipient)} · {GATEWAY_SUBTITLE[recipient.gateway]}
                    </p>
                    {recipient.missing.length > 0 && (
                      <p className="text-[10px] text-orange-400 mt-2">
                        Falta: {recipient.missing.map((f) => missingLabel(recipient.gateway, f)).join(', ')}
                      </p>
                    )}
                    {collects.length > 0 && (
                      <p className="text-[10px] text-neon-green mt-2 uppercase tracking-widest font-bold">
                        Cobra: {collects.map((s) => s.label).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(isEditing ? null : recipient.id)}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded border border-zinc-700 text-zinc-300 hover:border-neon-purple hover:text-neon-purple transition-colors"
                    >
                      {isEditing ? 'Cerrar' : 'Editar llaves'}
                    </button>
                    <button
                      type="button"
                      onClick={() => archive(recipient)}
                      disabled={busy}
                      title={recipient.archived ? 'Volver a habilitar' : 'Archivar'}
                      className="p-2 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {recipient.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(recipient)}
                      disabled={busy || !canDelete(accounts, recipient.id)}
                      title={
                        canDelete(accounts, recipient.id)
                          ? 'Borrar recaudador'
                          : 'Es el único que puede cobrar: configura otro antes de borrarlo'
                      }
                      className="p-2 rounded border border-zinc-800 text-zinc-600 hover:text-red-500 hover:border-red-500/50 transition-colors disabled:opacity-30 disabled:hover:text-zinc-600 disabled:hover:border-zinc-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 pt-6 border-t border-zinc-800 space-y-6">
                    <RecipientForm
                      gateway={recipient.gateway}
                      recipient={recipient}
                      onSaved={(data, text) => {
                        apply(data, text);
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                    <WebhookRow gateway={recipient.gateway} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Agregar ── */}
        <div className="mt-8 pt-8 border-t border-zinc-800">
          {adding ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  Nuevo recaudador de {GATEWAY_LABEL[adding]}
                </h3>
                <button
                  type="button"
                  onClick={() => setAdding(null)}
                  className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-zinc-300"
                >
                  Cerrar
                </button>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-lg flex items-start gap-4 border border-zinc-800">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300">
                  {adding === 'bold' ? (
                    <>
                      Saca las llaves en <b>bold.co → Integraciones → Llaves de integración → Botón de pagos</b>. Bold da
                      un par para <b>pruebas</b> y otro para <b>producción</b>: pega el par que corresponda al entorno
                      que elijas.
                    </>
                  ) : (
                    <>
                      Saca las llaves en <b>comercios.wompi.co → Desarrolladores</b>. La llave pública de pruebas empieza
                      en <b>pub_test_</b> y la de producción en <b>pub_prod_</b>.
                    </>
                  )}
                </p>
              </div>
              <RecipientForm
                gateway={adding}
                onSaved={(data, text) => {
                  apply(data, text);
                  setAdding(null);
                }}
                onCancel={() => setAdding(null)}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              {(['wompi', 'bold'] as Gateway[]).map((gateway) => (
                <button
                  key={gateway}
                  type="button"
                  onClick={() => setAdding(gateway)}
                  className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border border-zinc-800 text-zinc-300 hover:border-neon-purple hover:text-neon-purple transition-all text-xs font-black uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" /> Agregar recaudador de {GATEWAY_LABEL[gateway]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
