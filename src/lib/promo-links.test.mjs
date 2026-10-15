// Pruebas del enlace de venta online del promotor. Ejecutar:  npm run test:scan   (Node >= 22.18)
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkState, promoLinkUrl, buildPromoLinkMessage } from './promo-links.ts';

test('promoLinkUrl: arma /events/<id>?promo=<CODIGO> y quita barras sobrantes del sitio', () => {
  assert.equal(promoLinkUrl('https://kasadelsol.co', 'abc-123', 'DANIEL2601'), 'https://kasadelsol.co/events/abc-123?promo=DANIEL2601');
  assert.equal(promoLinkUrl('https://kasadelsol.co///', 'abc-123', 'X'), 'https://kasadelsol.co/events/abc-123?promo=X');
});

test('promoLinkUrl: un codigo con caracteres raros viaja codificado', () => {
  assert.equal(promoLinkUrl('https://s.co', 'e1', 'A B&C'), 'https://s.co/events/e1?promo=A%20B%26C');
});

test('linkState: sin escalones usa el descuento del codigo (0 si no tiene)', () => {
  assert.deepEqual(linkState({ discount_perc: 15 }), { ok: true, discountPerc: 15 });
  assert.deepEqual(linkState({ discount_perc: 0, tiers: [] }), { ok: true, discountPerc: 0 });
  assert.deepEqual(linkState({}), { ok: true, discountPerc: 0 });
});

test('linkState: con escalones manda el vigente, no el descuento base del codigo', () => {
  const s = linkState({ discount_perc: 5, tiers: [{}, {}], current_tier: { discount_perc: 20 } });
  assert.deepEqual(s, { ok: true, discountPerc: 20 });
});

test('linkState: con escalones y ninguno vigente, el enlace no deja comprar', () => {
  const s = linkState({ discount_perc: 5, tiers: [{}], current_tier: null });
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'NO_TIER');
  assert.match(s.message, /descuentos vigentes/);
});

test('linkState: limite de ventas alcanzado bloquea (y gana sobre lo demas, como en el servidor)', () => {
  const s = linkState({ discount_perc: 10, ticket_limit: 5, tickets_sold: 5, tiers: [{}], current_tier: { discount_perc: 20 } });
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'LIMIT');
});

test('linkState: con limite pero todavia con cupo, sigue vigente; sin limite (null o 0) nunca bloquea', () => {
  assert.equal(linkState({ discount_perc: 10, ticket_limit: 5, tickets_sold: 4 }).ok, true);
  assert.equal(linkState({ discount_perc: 10, ticket_limit: null, tickets_sold: 999 }).ok, true);
  assert.equal(linkState({ discount_perc: 10, ticket_limit: 0, tickets_sold: 3 }).ok, true);
});

test('mensaje con descuento: precio tachado, precio nuevo y enlace', () => {
  const m = buildPromoLinkMessage({
    eventTitle: 'Noche Solar',
    url: 'https://kasadelsol.co/events/e1?promo=ABC',
    stageName: 'Etapa 2 - Preventa',
    basePrice: '$ 50.000',
    finalPrice: '$ 40.000',
    discountPerc: 20,
  });
  assert.match(m, /\*Noche Solar\*/);
  assert.match(m, /~\$ 50\.000~ \*\$ 40\.000\* con mi código \(20% de descuento\)/);
  assert.match(m, /\(Etapa 2 - Preventa\)/);
  assert.ok(m.includes('https://kasadelsol.co/events/e1?promo=ABC'));
});

test('mensaje sin descuento: solo el precio, sin tachar', () => {
  const m = buildPromoLinkMessage({ eventTitle: 'X', url: 'https://s.co/e', basePrice: '$ 30.000', finalPrice: '$ 30.000', discountPerc: 0 });
  assert.match(m, /Precio ahora: \*\$ 30\.000\*/);
  assert.ok(!m.includes('~'));
});

test('mensaje sin etapa a la venta: no inventa precio y nunca deja el titulo vacio', () => {
  const m = buildPromoLinkMessage({ eventTitle: '   ', url: 'https://s.co/e' });
  assert.ok(!m.includes('Precio'));
  assert.match(m, /para \*el evento\*/);
  assert.ok(m.includes('https://s.co/e'));
});
