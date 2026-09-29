import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export default function Login() {
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(password);
      await qc.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            S
          </span>
          <span>
            <em>Serious</em> Job Tracker
          </span>
        </div>
        <p className="login-sub">Welcome back.</p>
        <label className="field">
          <span>Password</span>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" disabled={busy || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
