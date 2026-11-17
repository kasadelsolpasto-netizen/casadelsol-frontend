import { ExternalLink } from 'lucide-react';
import { DIAN_HOME, DIAN_LOGIN, DIAN_RUT_SIGNUP } from '@/lib/rut-guide';

const h2 = 'text-sm font-black uppercase tracking-widest text-white mt-8 mb-3';
const p = 'text-sm text-zinc-300 leading-relaxed';
const li = 'text-sm text-zinc-300 leading-relaxed';

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-neon-green underline underline-offset-4 hover:text-white break-words">
      {children} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
    </a>
  );
}

/** Instructivo RUT para artistas, con los enlaces de la DIAN para hacer el trámite. */
export default function RutGuide() {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <a href={DIAN_RUT_SIGNUP} target="_blank" rel="noopener noreferrer" className="min-h-[44px] px-4 rounded-xl bg-neon-green text-black text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2">
          Inscribirme en el RUT <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a href={DIAN_LOGIN} target="_blank" rel="noopener noreferrer" className="min-h-[44px] px-4 rounded-xl border border-zinc-700 text-zinc-200 text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:border-neon-purple">
          Ya tengo RUT: ingresar a la DIAN <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <h2 className={h2}>1. Para qué se necesita y qué tener a la mano</h2>
      <p className={p}>El RUT es el documento que permite a la organización girar los honorarios y soportar el pago ante la DIAN. El trámite es gratuito, se hace por internet y toma unos 15 minutos.</p>
      <p className={`${p} mt-3`}>Antes de empezar, tenga a la mano:</p>
      <ul className="mt-2 list-disc pl-5 space-y-1.5">
        <li className={li}>Cédula de ciudadanía (el sistema pide el número y la fecha de expedición).</li>
        <li className={li}>Correo electrónico personal y activo: allí llegan los códigos de verificación.</li>
        <li className={li}>Número de celular y dirección de residencia.</li>
      </ul>
      <p className={`${p} mt-3`}>
        <strong className="text-white">Ya tiene RUT:</strong> no se inscribe de nuevo. Ingrese a <Out href={DIAN_LOGIN}>dian.gov.co con su usuario</Out>, verifique que la actividad económica sea la indicada en la sección 3 y descargue una copia actualizada.
      </p>

      <h2 className={h2}>2. Paso a paso de la inscripción en línea</h2>
      <ol className="list-decimal pl-5 space-y-2">
        <li className={li}>Ingrese a <Out href={DIAN_HOME}>www.dian.gov.co</Out> y busque la opción de inscripción en el RUT («Inscríbase aquí en el RUT» o «Inscripción RUT persona natural»; el nombre del botón puede variar). También puede entrar directamente a la <Out href={DIAN_RUT_SIGNUP}>inscripción en línea</Out>.</li>
        <li className={li}>Seleccione <strong className="text-white">Persona natural</strong>.</li>
        <li className={li}>Escriba sus datos de identificación: tipo y número de documento, fecha de expedición y nombres completos, tal como aparecen en la cédula.</li>
        <li className={li}>Cuando el sistema pregunte para qué necesita el RUT, elija la opción de prestación de servicios o actividad independiente.</li>
        <li className={li}>Registre dirección, correo electrónico y celular.</li>
        <li className={li}>Registre la actividad económica principal con el código de la sección 3.</li>
        <li className={li}>En responsabilidades tributarias, verifique que quede la indicada en la sección 4.</li>
        <li className={li}>Confirme con el código que llega al correo, formalice y descargue el PDF. El documento válido dice <strong className="text-white">«Certificado»</strong>; si dice «Borrador», el trámite no ha terminado.</li>
      </ol>
      <p className={`${p} mt-3`}>Si la plataforma no permite terminar, solicite cita (virtual o presencial) por la opción de agendamiento de citas de la <Out href={DIAN_HOME}>página de la DIAN</Out>, trámite «Inscripción en el RUT».</p>

      <h2 className={h2}>3. Qué actividad económica inscribir</h2>
      <p className={p}>La actividad principal para quienes se presentan con música en vivo es la <strong className="text-white">9007 – Actividades de espectáculos musicales en vivo</strong>.</p>
      <p className={`${p} mt-3`}>Solo se inscribe la actividad que realmente se ejerce. Quien ya tiene RUT con otra actividad agrega el código correspondiente como principal o secundaria; no necesita borrar la anterior.</p>

      <h2 className={h2}>4. Responsabilidad tributaria y documentos para el pago</h2>
      <p className={p}>La responsabilidad que debe aparecer en la casilla 53 es <strong className="text-white">49 – No responsable de IVA</strong>. Aplica a personas naturales cuyos ingresos anuales por su actividad son inferiores a 3.500 UVT. Con esta responsabilidad no se expide factura electrónica: se cobra con cuenta de cobro.</p>
      <p className={`${p} mt-3`}>Quien supere ese tope o ya figure como responsable de IVA debe avisarlo antes de enviar documentos, porque su cobro se hace con factura electrónica.</p>
      <p className={`${p} mt-3`}>Documentos que cada artista envía para el pago:</p>
      <ul className="mt-2 list-disc pl-5 space-y-1.5">
        <li className={li}>RUT en PDF, certificado y con fecha de generación reciente.</li>
        <li className={li}>Copia de la cédula.</li>
        <li className={li}>Certificación bancaria de una cuenta a su nombre.</li>
        <li className={li}>Cuenta de cobro firmada, por el valor acordado y con el concepto de la presentación.</li>
      </ul>
    </div>
  );
}
