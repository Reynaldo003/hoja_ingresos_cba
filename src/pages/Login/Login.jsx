// src/pages/Login/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Lock, User } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const COLOR = { brand: "#131E5C", line: "rgba(19,30,92,0.16)" };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ username, password });
      const dest = location.state?.from?.pathname || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-[24px] border bg-white p-6 shadow-xl"
        style={{ borderColor: COLOR.line }}
      >
        <h1 className="text-[22px] font-semibold" style={{ color: COLOR.brand }}>
          Hoja de Ingresos
        </h1>
        <p className="mt-1 text-[12.5px]" style={{ color: "rgba(19,30,92,0.6)" }}>
          VW Córdoba — Inicia sesión con tu cuenta del CRM
        </p>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5" style={{ borderColor: COLOR.line }}>
            <User className="h-4 w-4" style={{ color: COLOR.brand }} />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              autoFocus
              className="w-full text-[13px] font-medium outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5" style={{ borderColor: COLOR.line }}>
            <Lock className="h-4 w-4" style={{ color: COLOR.brand }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full text-[13px] font-medium outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          style={{ background: COLOR.brand }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}