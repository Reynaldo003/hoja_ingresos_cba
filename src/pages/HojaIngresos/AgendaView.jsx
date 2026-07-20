// src/pages/HojaIngresos/AgendaView.jsx
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Phone, Users, XCircle } from "lucide-react";

const COLOR = {
  ink: "#07111F",
  inkSoft: "#536070",
  inkFaint: "#8A95A6",
  brand: "#001E50",
  brandDeep: "#000B24",
  brandMid: "#003B78",
  brandSoft: "#E8F0FA",
  brandLine: "#BFD0E7",
  accent: "#00B0F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFD",
  page: "#F4F7FB",
  line: "#DDE5EF",
  lineStrong: "#B9C7DA",
  ok: "#0B7A53",
  okSoft: "#E4F5ED",
  okLine: "#B9E2CD",
  warn: "#9A6400",
  warnSoft: "#FBF1DC",
  danger: "#B42318",
  dangerSoft: "#FDEAE7",
  dangerLine: "#F3C4BC",
  violet: "#4B3F99",
  violetSoft: "#ECEAF8",
  teal: "#087780",
  tealSoft: "#E0F4F5",
};

const FONT_DISPLAY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const APERTURA_DEFECTO = { hour: 8, minute: 0 };
const CIERRE_DEFECTO = { hour: 16, minute: 0 };

// Aquí controlas el ancho real de cada media hora.
const ADVISOR_COL_WIDTH = 220;
const SLOT_WIDTH = 220;
const ROW_HEIGHT = 220;
const HEADER_HEIGHT = 44;
const MEXICO_TZ = "America/Mexico_City";

// Único dealer que maneja este proyecto: VW Córdoba.
// Debe coincidir con ASESORES_CORDOBA de HojaIngresos.jsx.
export const ASESORES_CORDOBA = [
  { id: 1, nombre: "Yamil Tepole" },
  { id: 2, nombre: "Iván Ramírez" },
  { id: 3, nombre: "Verónica González" },
];

const ASESOR_PALETTE = [
  { bg: "#E8F0FA", line: "#BFD0E7", dot: "#001E50", text: "#001E50" },
  { bg: "#E0F4F5", line: "#B9E0E3", dot: "#087780", text: "#075D65" },
  { bg: "#FDEAE7", line: "#F3C4BC", dot: "#B42318", text: "#912018" },
  { bg: "#ECEAF8", line: "#D2CDEF", dot: "#4B3F99", text: "#3D337D" },
  { bg: "#E4F5ED", line: "#B9E2CD", dot: "#0B7A53", text: "#075F40" },
];

function normalizar(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function colorForAsesor(nombre) {
  if (!nombre) return ASESOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < nombre.length; i += 1) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  return ASESOR_PALETTE[hash % ASESOR_PALETTE.length];
}

function boolFromAny(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "si", "sí", "yes"].includes(text);
}

function asistenciaFromAny(cita) {
  const value = cita?.asistencia ?? cita?.asistido;
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return null;
}

function citaCitada(cita) {
  return boolFromAny(cita?.citado);
}

function tipoServicioMeta(tipo) {
  const t = normalizar(tipo);

  if (t.includes("campa")) {
    return {
      label: "Campaña",
      bg: "#DDFCF7",
      bgSoft: "#F2FFFD",
      text: "#008A7A",
      line: "#72E2D3",
      accent: "#14B8A6",
      shadow: "rgba(20, 184, 166, 0.18)",
    };
  }

  if (t.includes("diagn")) {
    return {
      label: "Diagnóstico",
      bg: "#F1E8FF",
      bgSoft: "#FBF7FF",
      text: "#6D28D9",
      line: "#C7A9FF",
      accent: "#7C3AED",
      shadow: "rgba(124, 58, 237, 0.18)",
    };
  }

  if (t.includes("repar")) {
    return {
      label: "Reparación",
      bg: "#FFF0D9",
      bgSoft: "#FFFAF2",
      text: "#C26A00",
      line: "#FFD08A",
      accent: "#F59E0B",
      shadow: "rgba(245, 158, 11, 0.18)",
    };
  }

  return {
    label: "Servicio",
    bg: "#E8F2FF",
    bgSoft: "#F6FAFF",
    text: "#0057D9",
    line: "#9BC7FF",
    accent: "#2563EB",
    shadow: "rgba(37, 99, 235, 0.18)",
  };
}

function getTiposServicio(cita) {
  const raw = cita?.tipo_cita;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw || "Servicio")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildHorarios(inicio, fin) {
  const slots = [];
  let totalMin = inicio.hour * 60 + inicio.minute;
  const finMin = fin.hour * 60 + fin.minute;

  while (totalMin <= finMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    totalMin += 30;
  }

  return slots;
}

function mexicoYMD(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: MEXICO_TZ });
}

function mexicoHourMinute(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;

  return {
    hour: Number(d.toLocaleString("en-US", { timeZone: MEXICO_TZ, hour: "numeric", hour12: false })),
    minute: Number(d.toLocaleString("en-US", { timeZone: MEXICO_TZ, minute: "numeric" })),
  };
}

function slotKeyFromFecha(fecha) {
  const hm = mexicoHourMinute(fecha);
  if (!hm) return null;
  const minutoSlot = hm.minute < 30 ? "00" : "30";
  return `${String(hm.hour).padStart(2, "0")}:${minutoSlot}`;
}

function horaCorta(fecha) {
  const hm = mexicoHourMinute(fecha);
  if (!hm) return "--:--";
  return `${String(hm.hour).padStart(2, "0")}:${String(hm.minute).padStart(2, "0")}`;
}

function nombreCliente(cita) {
  return (
    cita?.cliente_nombre ||
    cita?.cliente?.nombre ||
    cita?.nombre_cliente ||
    "Sin nombre"
  );
}

function telefonoCliente(cita) {
  return cita?.cliente_telefono || cita?.telefono || cita?.cliente?.telefono || "";
}

function clienteKey(cita) {
  return telefonoCliente(cita) || normalizar(nombreCliente(cita));
}

function Sparkline({ data = [] }) {
  const values = data.length ? data : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 36 - (value / max) * 30;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-10 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((value, index) => {
        const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
        const y = 36 - (value / max) * 30;
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="1.8" fill="currentColor" />;
      })}
    </svg>
  );
}

function Donut({ value }) {
  const safe = Math.max(0, Math.min(Number(value) || 0, 100));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = (safe / 100) * circumference;

  return (
    <svg viewBox="0 0 48 48" className="h-20 w-20 -rotate-90" aria-hidden="true">
      <circle cx="24" cy="24" r={radius} fill="none" stroke="#D7DFEC" strokeWidth="7" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke={COLOR.brand}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
      />
    </svg>
  );
}

function ChartCard({ title, value, data, tone = "brand" }) {
  const tones = {
    brand: COLOR.brand,
    violet: COLOR.violet,
    warn: COLOR.warn,
    ok: COLOR.ok,
    danger: COLOR.danger,
  };
  const selected = tones[tone] || COLOR.brand;

  return (
    <div className="min-w-0 border-r px-5 py-4 last:border-r-0" style={{ borderColor: COLOR.line }}>
      <div className="text-[13px] font-bold" style={{ color: COLOR.brand }}>{title}</div>
      <div className="mt-1 text-[24px] font-semibold leading-none tabular-nums" style={{ color: COLOR.brand }}>{value}</div>
      <div className="mt-2" style={{ color: selected }}>
        <Sparkline data={data} />
      </div>
      <div className="mt-1 grid grid-cols-6 text-center text-[9px] font-semibold" style={{ color: COLOR.inkFaint }}>
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}

function AdvisorAvatar({ nombre, color }) {
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
      style={{ background: color.bg, border: `1px solid ${color.line}`, color: color.text }}
    >
      {iniciales}
    </div>
  );
}

function AdvisorStats({ asesor, color, citasAsesor }) {
  const total = citasAsesor.length;
  const asistencias = citasAsesor.filter((c) => asistenciaFromAny(c) === true).length;
  const ocupacion = Math.min(Math.round((total / 8) * 100), 100);

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <AdvisorAvatar nombre={asesor.nombre} color={color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[13px] font-bold" style={{ color: COLOR.brand }}>{asesor.nombre}</div>
          <span className="h-2 w-2 rounded-full" style={{ background: color.dot }} />
        </div>
        <div className="mt-1 text-[10.5px] font-semibold" style={{ color: COLOR.inkFaint }}>
          <span style={{ color: COLOR.brand }}>{total}</span> citas · <span style={{ color: COLOR.ok }}>{asistencias}</span> asistencias
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: COLOR.line }}>
          <div className="h-full rounded-full" style={{ width: `${ocupacion}%`, background: color.dot }} />
        </div>
      </div>
    </div>
  );
}

function EstadoPill({ cita }) {
  const asistio = asistenciaFromAny(cita);
  const citado = citaCitada(cita);

  let meta = { label: "Pendiente", bg: "#FFF4E5", text: "#C26A00", line: "#FFD08A" };

  if (asistio === true) {
    meta = { label: "Asistió", bg: "#E7F8EF", text: "#138A55", line: "#9BE0BF" };
  } else if (asistio === false) {
    meta = { label: "No asistió", bg: "#FEECEC", text: "#D92D20", line: "#FFB4AB" };
  } else if (citado) {
    meta = { label: "Confirmado", bg: "#E8F2FF", text: "#0057D9", line: "#9BC7FF" };
  }

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-black"
      style={{ background: meta.bg, borderColor: meta.line, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

function TipoBadge({ tipo }) {
  const meta = tipoServicioMeta(tipo);

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-black"
      style={{ background: meta.bg, borderColor: meta.line, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

function AttendanceButton({ children, icon: Icon, active, disabled, onClick, tone }) {
  const palette = tone === "danger"
    ? { bg: "#FEECEC", bgActive: "#FFE1DE", line: "#FFB4AB", text: "#D92D20" }
    : { bg: "#E7F8EF", bgActive: "#D8F3E5", line: "#9BE0BF", text: "#138A55" };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: active ? palette.bgActive : "#FFFFFF",
        borderColor: active ? palette.line : "#DDE5EF",
        color: active ? palette.text : COLOR.inkSoft,
        boxShadow: active ? `0 6px 14px ${palette.line}55` : "none",
      }}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

function CitaCard({ cita, compact = false, abrirDetalle, onSetAsistencia, updatingInline = {} }) {
  const cliente = nombreCliente(cita);
  const telefono = telefonoCliente(cita);
  const tipos = getTiposServicio(cita);
  const asistio = asistenciaFromAny(cita);
  const modelo = cita.modelo || "Modelo sin capturar";
  const telefonoCorto = telefono
    ? telefono.replace(/(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3")
    : "Sin teléfono";

  const loadingAsistencia = !!updatingInline[`${cita.id}-asistencia`];
  const metaPrincipal = tipoServicioMeta(tipos[0]);

  const abrirConTeclado = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrirDetalle?.(cita);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => abrirDetalle?.(cita)}
      onKeyDown={abrirConTeclado}
      title={`${cliente} · clic para ver detalle`}
      className="group relative h-full min-w-[174px] overflow-hidden rounded-[14px] border p-2.5 text-left transition duration-200 hover:-translate-y-[2px] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#9BC7FF]"
      style={{
        background: `linear-gradient(180deg, #FFFFFF 0%, ${metaPrincipal.bgSoft} 100%)`,
        borderColor: metaPrincipal.line,
        boxShadow: `0 10px 24px ${metaPrincipal.shadow}`,
      }}
    >
      <span className="absolute bottom-0 left-0 top-0 w-[4px]" style={{ background: metaPrincipal.accent }} />

      <div
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border"
        style={{ background: "#FFFFFF", borderColor: "#DDE5EF", color: COLOR.inkFaint }}
      >
        <Phone className="h-3.5 w-3.5" />
      </div>

      <div className="pl-2 pr-7">
        <div className="text-[10px] font-black tabular-nums" style={{ color: metaPrincipal.text }}>
          {horaCorta(cita.fecha_ingreso || cita.fecha_cita)}
        </div>

        <div className="mt-1 truncate text-[11px] font-black uppercase tracking-wide" style={{ color: COLOR.brand }}>
          {cliente}
        </div>

        <div className="mt-1 space-y-0.5 text-[10px] font-semibold leading-4" style={{ color: COLOR.inkSoft }}>
          <div className="truncate">{modelo}</div>
          {!compact ? <div className="truncate tabular-nums">{telefonoCorto}</div> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 pl-2">
        {tipos.map((tipo) => (
          <TipoBadge key={tipo} tipo={tipo} />
        ))}
        <EstadoPill cita={cita} />
      </div>

      {!compact ? (
        <div className="mt-2 border-t border-dashed pl-2 pt-2" style={{ borderColor: "#DDE5EF" }}>
          <div className="mb-1 text-[9.5px] font-black" style={{ color: COLOR.inkFaint }}>
            Reportar asistencia
          </div>

          <div className="flex flex-wrap gap-1.5">
            <AttendanceButton
              icon={CheckCircle2}
              active={asistio === true}
              disabled={loadingAsistencia}
              tone="ok"
              onClick={(event) => {
                event.stopPropagation();
                onSetAsistencia?.(cita, true);
              }}
            >
              Asistió
            </AttendanceButton>

            <AttendanceButton
              icon={XCircle}
              active={asistio === false}
              disabled={loadingAsistencia}
              tone="danger"
              onClick={(event) => {
                event.stopPropagation();
                onSetAsistencia?.(cita, false);
              }}
            >
              No asistió
            </AttendanceButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptySlot() {
  // Solo visualización: ya no se puede crear una cita desde un espacio vacío.
  return <div className="h-full w-full rounded-[10px]" style={{ background: "rgba(248,250,253,0.55)" }} />;
}

export default function AgendaView({
  citas = [],
  abrirDetalle,
  onSetAsistencia,
  updatingInline = {},
  selectedDate = new Date().toISOString().split("T")[0],
}) {
  const [reloj, setReloj] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setReloj(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const asesores = ASESORES_CORDOBA;

  const citasDeLaFecha = useMemo(() => {
    if (!Array.isArray(citas)) return [];
    return citas.filter((cita) => {
      const fecha = cita.fecha_ingreso || cita.fecha_cita;
      if (!fecha) return false;
      return mexicoYMD(fecha) === selectedDate;
    });
  }, [citas, selectedDate]);

  const rangoHorario = useMemo(() => {
    let cierreMin = CIERRE_DEFECTO.hour * 60 + CIERRE_DEFECTO.minute;

    citasDeLaFecha.forEach((cita) => {
      const hm = mexicoHourMinute(cita.fecha_ingreso || cita.fecha_cita);
      if (!hm) return;
      const finCitaMin = hm.hour * 60 + (hm.minute < 30 ? 30 : 60);
      cierreMin = Math.max(cierreMin, finCitaMin);
    });

    return { inicio: APERTURA_DEFECTO, fin: { hour: Math.floor(cierreMin / 60), minute: cierreMin % 60 } };
  }, [citasDeLaFecha]);

  const horarios = useMemo(() => buildHorarios(rangoHorario.inicio, rangoHorario.fin), [rangoHorario]);

  const citasPorCelda = useMemo(() => {
    const map = new Map();

    citasDeLaFecha.forEach((cita) => {
      const asesor = cita.asesor || cita.nombre_asesor;
      const slot = slotKeyFromFecha(cita.fecha_ingreso || cita.fecha_cita);
      if (!asesor || !slot) return;

      const key = `${asesor}__${slot}`;
      const current = map.get(key) || [];
      current.push(cita);
      current.sort((a, b) => new Date(a.fecha_ingreso || a.fecha_cita) - new Date(b.fecha_ingreso || b.fecha_cita));
      map.set(key, current);
    });

    return map;
  }, [citasDeLaFecha]);

  const estadisticas = useMemo(() => {
    const total = citasDeLaFecha.length;
    const citados = citasDeLaFecha.filter(citaCitada).length;
    const noCitados = total - citados;
    const asistencias = citasDeLaFecha.filter((c) => asistenciaFromAny(c) === true).length;
    const noShow = citasDeLaFecha.filter((c) => asistenciaFromAny(c) === false).length;
    const clientes = new Set(citasDeLaFecha.map(clienteKey).filter(Boolean)).size;
    const tasaAsistencia = citados > 0 ? Math.round((asistencias / citados) * 100) : 0;

    return { total, citados, noCitados, asistencias, noShow, clientes, tasaAsistencia };
  }, [citasDeLaFecha]);

  const serieSemana = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const base = new Date(year, month - 1, day);
    const dayIndex = base.getDay() === 0 ? 6 : base.getDay() - 1;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayIndex);

    const dias = Array.from({ length: 6 }, (_, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      return d.toISOString().slice(0, 10);
    });

    const filtrarDia = (ymd) => citas.filter((c) => mexicoYMD(c.fecha_ingreso || c.fecha_cita) === ymd);

    return {
      citados: dias.map((ymd) => filtrarDia(ymd).filter(citaCitada).length),
      noCitados: dias.map((ymd) => filtrarDia(ymd).filter((c) => !citaCitada(c)).length),
      noShow: dias.map((ymd) => filtrarDia(ymd).filter((c) => asistenciaFromAny(c) === false).length),
    };
  }, [citas, selectedDate]);

  const posicionAhora = useMemo(() => {
    if (selectedDate !== mexicoYMD(reloj)) return null;
    const hm = mexicoHourMinute(reloj);
    if (!hm) return null;

    const minutosActuales = hm.hour * 60 + (hm.minute < 30 ? 0 : 30);
    const inicio = rangoHorario.inicio.hour * 60 + rangoHorario.inicio.minute;
    const fin = rangoHorario.fin.hour * 60 + rangoHorario.fin.minute;
    if (minutosActuales < inicio || minutosActuales > fin) return null;

    return ADVISOR_COL_WIDTH + ((minutosActuales - inicio) / 30) * SLOT_WIDTH;
  }, [reloj, selectedDate, rangoHorario]);

  const totalColumnas = horarios.length;
  const gridTemplateColumns = `${ADVISOR_COL_WIDTH}px repeat(${totalColumnas}, ${SLOT_WIDTH}px)`;
  const gridTemplateRows = `${HEADER_HEIGHT}px repeat(${Math.max(asesores.length, 1)}, ${ROW_HEIGHT}px)`;
  const gridWidth = ADVISOR_COL_WIDTH + totalColumnas * SLOT_WIDTH;

  if (asesores.length === 0) {
    return (
      <div className="rounded-[22px] border bg-white px-4 py-16 text-center" style={{ borderColor: COLOR.line }}>
        <Users className="mx-auto mb-3 h-8 w-8" style={{ color: COLOR.inkFaint }} />
        <p className="text-[14px] font-bold" style={{ color: COLOR.inkSoft }}>No hay asesores configurados para VW Córdoba</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid overflow-hidden rounded-[18px] border bg-white shadow-sm lg:grid-cols-[1fr_1fr_1fr_280px]" style={{ borderColor: COLOR.line, boxShadow: "0 14px 34px rgba(0, 30, 80, 0.08)" }}>
        <ChartCard title="Citados" value={estadisticas.citados} data={serieSemana.citados} tone="brand" />
        <ChartCard title="No Citados" value={estadisticas.noCitados} data={serieSemana.noCitados} tone="violet" />
        <ChartCard title="No Show" value={estadisticas.noShow} data={serieSemana.noShow} tone="warn" />
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-[13px] font-bold" style={{ color: COLOR.brand }}>Tasa de Asistencia</div>
            <div className="mt-1 text-[28px] font-semibold leading-none" style={{ color: COLOR.brand }}>{estadisticas.tasaAsistencia}%</div>
            <div className="mt-2 text-[11px] font-bold" style={{ color: COLOR.ok }}>+12% vs ayer</div>
          </div>
          <Donut value={estadisticas.tasaAsistencia} />
        </div>
      </div>

      <div
        className="relative overflow-auto rounded-[18px] border bg-white"
        style={{ borderColor: COLOR.line, maxHeight: 900, boxShadow: "0 18px 44px rgba(0, 30, 80, 0.08)" }}
      >
        <div
          className="relative"
          style={{ display: "grid", gridTemplateColumns, gridTemplateRows, width: gridWidth }}
        >
          <div
            className="sticky left-0 top-0 z-30 flex items-center px-5 text-[11px] font-black uppercase tracking-wide"
            style={{
              gridColumn: "1 / 2",
              gridRow: "1 / 2",
              background: COLOR.surface,
              color: COLOR.brand,
              borderRight: `1px solid ${COLOR.line}`,
              borderBottom: `1px solid ${COLOR.line}`,
            }}
          >
            Asesor
          </div>

          {horarios.map((slot, index) => {
            const esMediaHora = slot.endsWith(":30");
            return (
              <div
                key={slot}
                className="sticky top-0 z-20 flex items-center justify-center text-[11px] font-bold tabular-nums"
                style={{
                  gridColumn: `${2 + index} / span 1`,
                  gridRow: "1 / 2",
                  background: COLOR.surface,
                  color: slot.endsWith(":00") ? COLOR.brand : COLOR.inkSoft,
                  borderLeft: `1px ${esMediaHora ? "dashed" : "solid"} ${esMediaHora ? COLOR.lineStrong : COLOR.line}`,
                  borderBottom: `1px solid ${COLOR.line}`,
                }}
              >
                {slot}
              </div>
            );
          })}

          {asesores.map((asesor, rowIdx) => {
            const color = colorForAsesor(asesor.nombre);
            const citasAsesor = citasDeLaFecha.filter((c) => (c.asesor || c.nombre_asesor) === asesor.nombre);

            return (
              <div key={asesor.id} style={{ display: "contents" }}>
                <div
                  className="sticky left-0 z-10 flex items-center px-4"
                  style={{
                    gridColumn: "1 / 2",
                    gridRow: `${2 + rowIdx} / span 1`,
                    background: rowIdx % 2 ? COLOR.surfaceAlt : COLOR.surface,
                    borderRight: `1px solid ${COLOR.line}`,
                    borderBottom: `1px solid ${COLOR.line}`,
                  }}
                >
                  <AdvisorStats asesor={asesor} color={color} citasAsesor={citasAsesor} />
                </div>

                {horarios.map((slot, colIdx) => {
                  const citasCelda = citasPorCelda.get(`${asesor.nombre}__${slot}`) || [];
                  const esMediaHora = slot.endsWith(":30");

                  return (
                    <div
                      key={`${asesor.id}-${slot}`}
                      className="p-2"
                      style={{
                        gridColumn: `${2 + colIdx} / span 1`,
                        gridRow: `${2 + rowIdx} / span 1`,
                        background: rowIdx % 2 ? COLOR.surfaceAlt : COLOR.surface,
                        borderLeft: `1px ${esMediaHora ? "dashed" : "solid"} ${esMediaHora ? COLOR.lineStrong : COLOR.line}`,
                        borderBottom: `1px solid ${COLOR.line}`,
                      }}
                    >
                      {citasCelda.length > 0 ? (
                        <div className="flex h-full gap-2 overflow-x-auto pb-0.5">
                          {citasCelda.map((cita) => (
                            <CitaCard
                              key={cita.id || `${asesor.nombre}-${slot}-${nombreCliente(cita)}`}
                              cita={cita}
                              compact={citasCelda.length > 1}
                              abrirDetalle={abrirDetalle}
                              onSetAsistencia={onSetAsistencia}
                              updatingInline={updatingInline}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptySlot />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {posicionAhora !== null ? (
            <div
              className="pointer-events-none absolute z-20"
              style={{ left: posicionAhora, top: HEADER_HEIGHT, bottom: 0, width: 2, background: COLOR.danger }}
            >
              <div className="absolute -left-[5px] -top-2 h-3 w-3 rounded-full" style={{ background: COLOR.danger, boxShadow: "0 0 0 4px rgba(180,35,24,0.12)" }} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold" style={{ color: COLOR.inkFaint }}>
        <TipoBadge tipo="Servicio" />
        <TipoBadge tipo="Reparación" />
        <TipoBadge tipo="Diagnóstico" />
        <TipoBadge tipo="Campaña" />
      </div>
    </div>
  );
}