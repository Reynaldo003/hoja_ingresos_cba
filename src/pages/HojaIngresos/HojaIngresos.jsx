// src/pages/HojaIngresos/HojaIngresos.jsx
import { useEffect, useMemo, useState } from "react";
import logoVW from "../../assets/logo-vw.png";
import { createPortal } from "react-dom";
import {
    ArrowUpDown, Calendar, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft,
    ChevronRight, ChevronUp, ClipboardList, Clock3, Loader2, Search,
    Table2, User, X, XCircle,
} from "lucide-react";

import { apiHojaIngresos } from "../../lib/apiHojaIngresos";
import AgendaView from "./AgendaView";

const COLOR = {
    brand: "#131E5C", white: "#FFFFFF",
    ink: "#131E5C", inkSoft: "rgba(19,30,92,0.78)", inkFaint: "rgba(19,30,92,0.58)",
    surface: "#FFFFFF", paper: "#FFFFFF",
    line: "rgba(19,30,92,0.16)",
    brandSoft: "rgba(19,30,92,0.06)",
    ok: "#131E5C", okSoft: "rgba(19,30,92,0.06)",
    danger: "#131E5C", dangerSoft: "rgba(19,30,92,0.06)",
};

const AGENCIA_LABEL = "VW Córdoba";

function normalizeStr(value) { return String(value ?? "").trim(); }
function normalizeKey(value) {
    return normalizeStr(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function esCordoba(agencia) {
    // Si el registro no trae agencia asumimos que pertenece a este dealer (single-tenant).
    if (!agencia) return true;
    return normalizeKey(agencia).includes("cordoba");
}

function boolFromAny(value) {
    if (typeof value === "boolean") return value;
    const text = String(value ?? "").trim().toLowerCase();
    return ["true", "1", "si", "sí", "yes"].includes(text);
}

function toDTLocal(value) {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16);
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function toYMD(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
const MEXICO_TZ = "America/Mexico_City";
function mexicoYMD(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-CA", { timeZone: MEXICO_TZ });
}
function ymdToInt(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return Number(value.replaceAll("-", ""));
}
function formatDate(value) {
    const local = toDTLocal(value);
    return local ? local.replace("T", "  ·  ") : "—";
}
function formatFechaLarga(ymd) {
    if (!ymd) return "";
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const texto = date.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function sumarDias(ymd, delta) {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    return toYMD(date);
}
function getClienteNombre(row) {
    return row?.cliente_nombre || row?.nombre_cliente || row?.cliente?.nombre || "—";
}
function getTelefono(row) { return row?.cliente_telefono || row?.telefono || row?.cliente?.telefono || "—"; }

function SkeletonRow({ columns = 10 }) {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3.5 w-24 animate-pulse rounded" style={{ background: COLOR.line }} />
                </td>
            ))}
        </tr>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <ClipboardList className="mb-3 h-7 w-7" style={{ color: COLOR.inkFaint }} />
            <p className="text-[13px] font-semibold" style={{ color: COLOR.inkSoft }}>
                No hay registros con los filtros seleccionados
            </p>
            <p className="mt-1 text-[12px]" style={{ color: COLOR.inkFaint }}>
                Ajusta la búsqueda o el rango de fechas para ver más resultados.
            </p>
        </div>
    );
}

function FilterBlock({ label, children }) {
    return (
        <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: COLOR.inkFaint }}>
                {label}
            </div>
            {children}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: COLOR.inkFaint }}>
                {label}
            </div>
            <div className="text-[13.5px] font-semibold" style={{ color: COLOR.ink }}>
                {children || <span style={{ color: COLOR.inkFaint, fontWeight: 500 }}>—</span>}
            </div>
        </div>
    );
}

function Modal({ open, title, subtitle, onClose, children }) {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-[#131E5C]/55 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 left-0 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
                    <div
                        className="relative w-full overflow-hidden rounded-[28px] border shadow-2xl"
                        style={{ maxWidth: "min(100%, 900px)", background: COLOR.surface, borderColor: "rgba(255,255,255,0.24)" }}
                    >
                        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: COLOR.brand }}>
                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                                    {subtitle || "Registro de servicio"}
                                </div>
                                <span className="mt-1 block truncate text-[17px] font-semibold text-white">{title}</span>
                            </div>
                            <button
                                type="button" onClick={onClose} aria-label="Cerrar"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5" style={{ background: COLOR.surface, maxHeight: "min(72vh, calc(100dvh - 180px))" }}>
                            {children}
                        </div>
                        <div className="flex justify-end border-t px-5 py-4" style={{ borderColor: COLOR.line }}>
                            <button
                                type="button" onClick={onClose}
                                className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-[13px] font-semibold"
                                style={{ borderColor: COLOR.line, color: COLOR.inkSoft }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

function BooleanButton({ row, field, updatingInline, onToggle }) {
    const isUpdating = !!updatingInline[`${row.id}-${field}`];
    const value = boolFromAny(row[field]);
    return (
        <button
            type="button" disabled={isUpdating}
            onClick={(event) => { event.stopPropagation(); onToggle(row, field); }}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-opacity"
            style={{
                background: value ? COLOR.brand : COLOR.surface, borderColor: COLOR.brand,
                color: value ? COLOR.surface : COLOR.brand, opacity: isUpdating ? 0.6 : 1,
                cursor: isUpdating ? "not-allowed" : "pointer",
            }}
        >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : value ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {value ? "Sí" : "No"}
        </button>
    );
}

function MetricCard({ icon: Icon, label, value, hint }) {
    return (
        <div className="rounded-[18px] border bg-white px-5 py-4 shadow-sm" style={{ borderColor: COLOR.line, boxShadow: "0 14px 34px rgba(19,30,92,0.08)" }}>
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ background: COLOR.surface, borderColor: COLOR.line }}>
                    <Icon className="h-6 w-6" style={{ color: COLOR.brand }} />
                </div>
                <div className="min-w-0">
                    <div className="text-[26px] font-semibold leading-none tabular-nums" style={{ color: COLOR.brand }}>{value}</div>
                    <div className="mt-1 text-[12px] font-semibold" style={{ color: COLOR.brand }}>{label}</div>
                    <div className="mt-1 text-[11px] font-semibold" style={{ color: COLOR.inkFaint }}>{hint}</div>
                </div>
            </div>
        </div>
    );
}

function ViewToggle({ vista, setVista }) {
    const opciones = [
        { key: "agenda", label: "Agenda", icon: CalendarDays },
        { key: "tabla", label: "Tabla", icon: Table2 },
    ];
    return (
        <div className="inline-flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: COLOR.line, background: COLOR.surface }}>
            {opciones.map((op) => {
                const active = vista === op.key;
                const Icon = op.icon;
                return (
                    <button
                        key={op.key} type="button" onClick={() => setVista(op.key)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition"
                        style={{ background: active ? COLOR.brand : "transparent", color: active ? "#fff" : COLOR.brand }}
                    >
                        <Icon className="h-3.5 w-3.5" /> {op.label}
                    </button>
                );
            })}
        </div>
    );
}

function DateNav({ selectedDate, setSelectedDate }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center overflow-hidden rounded-xl border" style={{ borderColor: COLOR.line }}>
                <button type="button" onClick={() => setSelectedDate((d) => sumarDias(d, -1))} className="p-2" style={{ color: COLOR.brand }} title="Día anterior">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    type="button" onClick={() => setSelectedDate(toYMD(new Date()))}
                    className="border-x px-3 py-2 text-[12.5px] font-bold" style={{ borderColor: COLOR.line, color: COLOR.brand }}
                >
                    Hoy
                </button>
                <button type="button" onClick={() => setSelectedDate((d) => sumarDias(d, 1))} className="p-2" style={{ color: COLOR.brand }} title="Día siguiente">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: COLOR.line }}>
                <Calendar className="h-3.5 w-3.5" style={{ color: COLOR.inkFaint }} />
                <input
                    type="date" value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="text-[12.5px] font-bold outline-none" style={{ color: COLOR.brand, background: "transparent" }}
                />
            </div>

            <span
                className="inline-flex items-center rounded-xl border px-3 py-2 text-[12.5px] font-bold"
                style={{ borderColor: COLOR.line, color: COLOR.brand, background: COLOR.brandSoft }}
            >
                {AGENCIA_LABEL}
            </span>
        </div>
    );
}

export default function HojaRegistros() {
    const [rows, setRows] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [vista, setVista] = useState("agenda");
    const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));

    const [openModal, setOpenModal] = useState(false);
    const [detalle, setDetalle] = useState(null);

    const [updatingInline, setUpdatingInline] = useState({});

    const [sort, setSort] = useState({ key: "fecha_ingreso", dir: "desc" });
    const [filters, setFilters] = useState({ q: "", desde: "", hasta: "" });

    const columns = [
        { key: "fecha_ingreso", label: "Fecha de ingreso", sortable: true },
        { key: "cliente", label: "Cliente", sortable: true },
        { key: "asistencia", label: "Asistencia" },
        { key: "asesor", label: "Asesor", sortable: true },
        { key: "pauta", label: "Campaña" },
        { key: "citado", label: "Citado" },
        { key: "torre", label: "Torre" },
        { key: "tipo_cita", label: "Tipo de servicio" },
        { key: "vin", label: "VIN" },
        { key: "medio_concertacion", label: "Medio" },
    ];

    async function refreshList() {
    setLoadingList(true);
    try {
        const data = await apiHojaIngresos.list({ agencia: "VW Cordoba" });
        const soloCordoba = (Array.isArray(data) ? data : []).filter((row) => esCordoba(row.agencia));
        setRows(soloCordoba);
    } catch (error) {
        console.error(error);
        setRows([]);
        alert("No se pudo cargar la hoja de ingresos.");
    } finally {
        setLoadingList(false);
    }
}

    useEffect(() => { refreshList(); }, []);

    const filtered = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        const desdeInt = ymdToInt(filters.desde);
        const hastaInt = ymdToInt(filters.hasta);

        return (rows || []).filter((row) => {
            let matchFecha = true;
            if (desdeInt !== null || hastaInt !== null) {
                const actualInt = ymdToInt(row.fecha_ingreso ? toYMD(row.fecha_ingreso) : "");
                if (!actualInt) return false;
                if (desdeInt !== null && actualInt < desdeInt) matchFecha = false;
                if (hastaInt !== null && actualInt > hastaInt) matchFecha = false;
            }
            const values = [
                row.no_orden, getClienteNombre(row), getTelefono(row),
                row.diss, row.pauta, row.torre, row.asesor, row.tipo_cita, row.vin, row.medio_concertacion,
            ];
            const matchQ = !q || values.some((value) => normalizeStr(value).toLowerCase().includes(q));
            return matchFecha && matchQ;
        });
    }, [rows, filters]);

    const sorted = useMemo(() => {
        const data = [...filtered];
        const { key, dir } = sort;
        const mult = dir === "asc" ? 1 : -1;
        return data.sort((a, b) => {
            if (key === "fecha_ingreso") {
                const ta = a.fecha_ingreso ? new Date(a.fecha_ingreso).getTime() : 0;
                const tb = b.fecha_ingreso ? new Date(b.fecha_ingreso).getTime() : 0;
                return (ta - tb) * mult;
            }
            if (key === "cliente") {
                const va = getClienteNombre(a).toLowerCase();
                const vb = getClienteNombre(b).toLowerCase();
                if (va < vb) return -1 * mult;
                if (va > vb) return 1 * mult;
                return 0;
            }
            const va = normalizeStr(a?.[key]).toLowerCase();
            const vb = normalizeStr(b?.[key]).toLowerCase();
            if (va < vb) return -1 * mult;
            if (va > vb) return 1 * mult;
            return 0;
        });
    }, [filtered, sort]);

    const citasSeleccionadas = useMemo(() => {
        return (rows || []).filter((row) => {
            const fecha = row.fecha_ingreso;
            if (!fecha) return false;
            return mexicoYMD(fecha) === selectedDate;
        });
    }, [rows, selectedDate]);

    const metricas = useMemo(() => {
        const total = citasSeleccionadas.length;
        const citados = citasSeleccionadas.filter((r) => boolFromAny(r.citado)).length;
        const asistencias = citasSeleccionadas.filter((r) => boolFromAny(r.asistencia)).length;
        const clientes = new Set(citasSeleccionadas.map((r) => getTelefono(r)).filter(Boolean)).size;
        const tasa = citados > 0 ? Math.round((asistencias / citados) * 100) : 0;
        return { total, citados, asistencias, clientes, tasa };
    }, [citasSeleccionadas]);

    function toggleSort(key) {
        setSort((prev) => {
            if (prev.key !== key) return { key, dir: "asc" };
            return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
        });
    }

    function resetFilters() { setFilters({ q: "", desde: "", hasta: "" }); }
    function setHoy() {
        const hoy = toYMD(new Date());
        setFilters((prev) => ({ ...prev, desde: hoy, hasta: hoy }));
    }

    async function abrirDetalle(row) {
        if (!row?.id) return;
        setOpenModal(true);
        setLoadingDetail(true);
        setDetalle(null);

        try {
            const data = await apiHojaIngresos.get(row.id);
            setDetalle(data);
        } catch (error) {
            console.error(error);
            alert("No se pudo abrir el registro.");
            setOpenModal(false);
        } finally {
            setLoadingDetail(false);
        }
    }

    function cerrarModal() {
        setOpenModal(false);
        setDetalle(null);
    }

    async function patchBoolean(row, field) {
        if (!row?.id) return;
        const previous = boolFromAny(row[field]);
        const next = !previous;

        setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, [field]: next } : item)));
        setUpdatingInline((prev) => ({ ...prev, [`${row.id}-${field}`]: true }));

        try {
            await apiHojaIngresos.patch(row.id, { [field]: next });
        } catch (error) {
            console.error(error);
            setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, [field]: previous } : item)));
            alert(`No se pudo actualizar ${field}.`);
        } finally {
            setUpdatingInline((prev) => {
                const copy = { ...prev };
                delete copy[`${row.id}-${field}`];
                return copy;
            });
        }
    }

    function setAsistenciaDesdeAgenda(cita, value) {
        const previous = boolFromAny(cita.asistencia);
        if (previous === value) return;
        patchBoolean({ id: cita.id, asistencia: previous }, "asistencia");
    }

    const tipoCitaList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

    return (
    <div className="w-full min-h-screen rounded-[14px] px-4 py-2 md:px-8 lg:px-10">
            <section className="mb-4 text-[#131E5C]">
                <div className="grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
    <div className="flex items-center gap-3">
        <img src={logoVW} alt="Volkswagen" className="h-11 w-11 shrink-0 object-contain md:h-14 md:w-14" />
        <h1 className="text-[32px] font-semibold leading-none tracking-[-0.045em] md:text-[46px]">
            Hoja de Ingresos
        </h1>
    </div>
                        <p className="mt-3 max-w-2xl text-[13px] font-medium leading-6">
                            Control diario de ingresos de servicio Volkswagen R&amp;R — {formatFechaLarga(selectedDate)} · {AGENCIA_LABEL}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-end">
                        <div className="flex flex-wrap items-center gap-2">
                            <ViewToggle vista={vista} setVista={setVista} />
                        </div>
                        {vista === "agenda" ? <DateNav selectedDate={selectedDate} setSelectedDate={setSelectedDate} /> : null}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={Clock3} label="Citas del día" value={metricas.total} hint={`${metricas.tasa}% tasa de asistencia`} />
                    <MetricCard icon={User} label="Citados" value={metricas.citados} hint={`${metricas.total - metricas.citados} no citados`} />
                    <MetricCard icon={CheckCircle2} label="Asistencias" value={metricas.asistencias} hint={`${metricas.tasa}% sobre citados`} />
                    <MetricCard icon={User} label="Clientes únicos" value={metricas.clientes} hint="Calculado por teléfono" />
                </div>
            </section>

            {vista === "agenda" ? (
                <AgendaView
                    citas={rows}
                    selectedDate={selectedDate}
                    abrirDetalle={abrirDetalle}
                    onSetAsistencia={(cita, value) => setAsistenciaDesdeAgenda(cita, value)}
                    updatingInline={updatingInline}
                />
            ) : (
                <>
                    <div className="mb-3 rounded-lg border p-3" style={{ background: COLOR.surface, borderColor: COLOR.line }}>
                        <div className="grid gap-3 md:grid-cols-12">
                            <div className="md:col-span-7">
                                <FilterBlock label="Búsqueda">
                                    <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: COLOR.line }}>
                                        <Search className="h-3.5 w-3.5" style={{ color: COLOR.inkFaint }} />
                                        <input
                                            value={filters.q}
                                            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                                            placeholder="Cliente, teléfono, VIN, asesor, orden..."
                                            className="w-full text-[13px] font-medium outline-none"
                                            style={{ color: COLOR.ink }}
                                        />
                                        {filters.q && (
                                            <button type="button" onClick={() => setFilters((prev) => ({ ...prev, q: "" }))}>
                                                <X className="h-3.5 w-3.5" style={{ color: COLOR.inkFaint }} />
                                            </button>
                                        )}
                                    </div>
                                </FilterBlock>
                            </div>

                            <div className="md:col-span-2">
                                <FilterBlock label="Desde">
                                    <input
                                        type="date" value={filters.desde}
                                        onChange={(event) => setFilters((prev) => ({ ...prev, desde: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 text-[13px] font-medium outline-none"
                                        style={{ borderColor: COLOR.line, color: COLOR.ink }}
                                    />
                                </FilterBlock>
                            </div>

                            <div className="md:col-span-2">
                                <FilterBlock label="Hasta">
                                    <input
                                        type="date" value={filters.hasta}
                                        onChange={(event) => setFilters((prev) => ({ ...prev, hasta: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 text-[13px] font-medium outline-none"
                                        style={{ borderColor: COLOR.line, color: COLOR.ink }}
                                    />
                                </FilterBlock>
                            </div>

                            <div className="md:col-span-1">
                                <FilterBlock label=" ">
                                    <div className="flex gap-1.5">
                                        <button type="button" onClick={setHoy} title="Filtrar por hoy" className="flex-1 rounded-lg py-2 text-[11px] font-semibold" style={{ background: COLOR.brandSoft, color: COLOR.brand }}>
                                            Hoy
                                        </button>
                                        <button type="button" onClick={resetFilters} title="Limpiar filtros" className="flex-1 rounded-lg border py-2 text-[11px] font-semibold" style={{ borderColor: COLOR.line, color: COLOR.inkSoft }}>
                                            Limpiar
                                        </button>
                                    </div>
                                </FilterBlock>
                            </div>
                        </div>

                        <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: COLOR.inkFaint }}>
                            <span className="font-semibold" style={{ color: COLOR.ink }}>{sorted.length}</span>
                            registro{sorted.length === 1 ? "" : "s"} encontrado{sorted.length === 1 ? "" : "s"}
                        </div>
                    </div>

                    {/* TABLA DESKTOP */}
                    <div className="hidden overflow-hidden rounded-lg border lg:block" style={{ background: COLOR.surface, borderColor: COLOR.line }}>
                        <div className="w-full overflow-x-auto">
                            <table className="min-w-[1500px] w-full text-left text-[13px]">
                                <thead className="sticky top-0 z-10" style={{ background: COLOR.brand }}>
                                    <tr>
                                        {columns.map((column) => (
                                            <th key={column.key} className="whitespace-nowrap px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-white/90">
                                                {column.sortable ? (
                                                    <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1">
                                                        {column.label}
                                                        {sort.key === column.key ? (
                                                            sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                        )}
                                                    </button>
                                                ) : column.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingList ? (
                                        Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} columns={columns.length} />)
                                    ) : sorted.length === 0 ? (
                                        <tr><td colSpan={columns.length}><EmptyState /></td></tr>
                                    ) : (
                                        sorted.map((row, index) => (
                                            <tr
                                                key={row.id}
                                                onDoubleClick={() => abrirDetalle(row)}
                                                title="Doble clic para ver detalle"
                                                className="cursor-pointer transition-colors"
                                                style={{ background: index % 2 === 0 ? COLOR.surface : COLOR.paper, borderTop: `1px solid ${COLOR.line}` }}
                                            >
                                                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums" style={{ color: COLOR.inkSoft }}>{formatDate(row.fecha_ingreso)}</td>
                                                <td className="whitespace-nowrap px-4 py-2.5">
                                                    <div className="font-semibold" style={{ color: COLOR.ink }}>{getClienteNombre(row)}</div>
                                                    <div className="text-[11px]" style={{ color: COLOR.inkFaint }}>{getTelefono(row)}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-2.5"><BooleanButton row={row} field="asistencia" updatingInline={updatingInline} onToggle={patchBoolean} /></td>
                                                <td className="whitespace-nowrap px-4 py-2.5" style={{ color: COLOR.ink }}>{row.asesor || "—"}</td>
                                                <td className="max-w-[200px] px-4 py-2.5" style={{ color: COLOR.inkSoft }}><span className="line-clamp-1">{row.pauta || "—"}</span></td>
                                                <td className="whitespace-nowrap px-4 py-2.5"><BooleanButton row={row} field="citado" updatingInline={updatingInline} onToggle={patchBoolean} /></td>
                                                <td className="whitespace-nowrap px-4 py-2.5" style={{ color: COLOR.inkSoft }}>{row.torre || "—"}</td>
                                                <td className="whitespace-nowrap px-4 py-2.5">
                                                    {row.tipo_cita ? (
                                                        <span className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold" style={{ background: COLOR.surface, color: COLOR.brand }}>{row.tipo_cita}</span>
                                                    ) : <span style={{ color: COLOR.inkFaint }}>—</span>}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px]" style={{ color: COLOR.inkSoft }}>{row.vin || "—"}</td>
                                                <td className="whitespace-nowrap px-4 py-2.5" style={{ color: COLOR.inkSoft }}>{row.medio_concertacion || "—"}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* VISTA MÓVIL */}
                    <div className="grid gap-2.5 lg:hidden">
                        {loadingList ? (
                            <div className="rounded-[24px] border p-5" style={{ background: COLOR.surface, borderColor: COLOR.line }}>
                                <div className="flex items-center gap-2 font-semibold" style={{ color: COLOR.ink }}>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                                </div>
                            </div>
                        ) : sorted.length === 0 ? (
                            <div className="rounded-[24px] border p-8" style={{ background: COLOR.surface, borderColor: COLOR.line }}><EmptyState /></div>
                        ) : (
                            sorted.map((row) => (
                                <button
                                    key={row.id} type="button" onClick={() => abrirDetalle(row)}
                                    className="rounded-[24px] border p-3.5 text-left" style={{ background: COLOR.surface, borderColor: COLOR.line }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-[14px] font-semibold" style={{ color: COLOR.ink }}>{getClienteNombre(row)}</div>
                                            <div className="mt-0.5 text-[12px]" style={{ color: COLOR.inkSoft }}>{getTelefono(row)}</div>
                                            <div className="mt-0.5 text-[11.5px] tabular-nums" style={{ color: COLOR.inkFaint }}>{formatDate(row.fecha_ingreso)}</div>
                                            {row.asesor ? <div className="mt-2 text-[12px] font-semibold" style={{ color: COLOR.brand }}>{row.asesor}</div> : null}
                                        </div>
                                        <span
                                            className="inline-flex shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold"
                                            style={boolFromAny(row.citado) ? { background: COLOR.okSoft, color: COLOR.ok } : { background: COLOR.dangerSoft, color: COLOR.danger }}
                                        >
                                            {boolFromAny(row.citado) ? "Citado" : "No citado"}
                                        </span>
                                    </div>
                                    {(row.comentarios || row.pauta) && (
                                        <div className="mt-2.5 line-clamp-2 text-[12.5px]" style={{ color: COLOR.inkSoft }}>{row.comentarios || row.pauta}</div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Modal de solo lectura */}
            <Modal
                open={openModal}
                title={detalle ? getClienteNombre(detalle) : "Cargando..."}
                subtitle={detalle?.id ? `Registro #${detalle.id} · ${AGENCIA_LABEL}` : "Registro de servicio"}
                onClose={cerrarModal}
            >
                {loadingDetail ? (
                    <div className="grid gap-3 md:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border p-3" style={{ borderColor: COLOR.line, background: COLOR.surface }}>
                                <div className="h-3 w-20 rounded" style={{ background: COLOR.line }} />
                                <div className="mt-3 h-4 w-full rounded" style={{ background: COLOR.line }} />
                            </div>
                        ))}
                    </div>
                ) : !detalle ? null : (
                    <div className="grid gap-x-4 gap-y-4 md:grid-cols-3">
                        <Field label="Fecha de ingreso">{formatDate(detalle.fecha_ingreso)}</Field>
                        <Field label="Hora y día promesa">{formatDate(detalle.hora_promesa)}</Field>
                        <Field label="Asesor">{detalle.asesor}</Field>

                        <Field label="Teléfono">{getTelefono(detalle)}</Field>
                        <Field label="Correo electrónico">{detalle.cliente_correo_electronico || detalle.correo}</Field>
                        <Field label="Agendado por">{detalle.agendado_por}</Field>

                        <Field label="VIN">{detalle.vin}</Field>
                        <Field label="Modelo">{detalle.modelo}</Field>
                        <Field label="Año del vehículo">{detalle.anio_vehiculo}</Field>

                        <Field label="Medio de concertación">{detalle.medio_concertacion}</Field>
                        <Field label="Torre">{detalle.torre}</Field>
                        <Field label="DISS">{detalle.diss}</Field>

                        <Field label="Citado">{boolFromAny(detalle.citado) ? "Sí" : "No"}</Field>
                        <Field label="Asistencia">{boolFromAny(detalle.asistencia) ? "Sí" : "No"}</Field>
                        <Field label="Campaña">{detalle.pauta}</Field>

                        <div className="md:col-span-3">
                            <Field label="Tipo de servicio">
                                {tipoCitaList(
                                    Array.isArray(detalle.tipo_cita)
                                        ? detalle.tipo_cita
                                        : String(detalle.tipo_cita || "").split(",").map((t) => t.trim()).filter(Boolean)
                                ).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {(Array.isArray(detalle.tipo_cita)
                                            ? detalle.tipo_cita
                                            : String(detalle.tipo_cita || "").split(",").map((t) => t.trim()).filter(Boolean)
                                        ).map((tipo) => (
                                            <span key={tipo} className="rounded px-2 py-0.5 text-[11px] font-semibold" style={{ background: COLOR.brandSoft, color: COLOR.brand }}>{tipo}</span>
                                        ))}
                                    </div>
                                ) : "—"}
                            </Field>
                        </div>

                        {detalle.pre_picking_notas ? (
                            <div className="md:col-span-3">
                                <Field label="Notas de Pre-Picking">{detalle.pre_picking_notas}</Field>
                            </div>
                        ) : null}

                        {detalle.declaracion_textual_cliente ? (
                            <div className="md:col-span-3">
                                <Field label="Declaración textual del cliente">{detalle.declaracion_textual_cliente}</Field>
                            </div>
                        ) : null}

                        {detalle.comentarios ? (
                            <div className="md:col-span-3">
                                <Field label="Comentarios">{detalle.comentarios}</Field>
                            </div>
                        ) : null}
                    </div>
                )}
            </Modal>
        </div>
    );
}