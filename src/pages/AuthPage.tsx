import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { RpcError } from "../api/rpc";

export default function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    params.get("signup") ? "signup" : "login"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/dashboard");
      } else {
        const msg = await signup(email, password, name);
        setMessage(msg);
      }
    } catch (err) {
      setError(err instanceof RpcError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight text-text">
            super<span className="text-primary">cut</span>
          </a>
          <p className="text-text-muted text-sm mt-2">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          {message ? (
            <div className="text-center">
              <div className="text-success text-sm mb-6">{message}</div>
              <Button variant="ghost" size="sm" onClick={() => { setMessage(""); setMode("login"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-text-muted font-medium">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-muted font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-muted font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {error && (
                <p className="text-error text-xs">{error}</p>
              )}

              <Button type="submit" loading={loading} className="mt-2 w-full">
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
          )}
        </div>

        {!message && (
          <p className="text-center text-sm text-text-muted mt-4">
            {mode === "login" ? "No account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="text-primary hover:underline cursor-pointer"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
