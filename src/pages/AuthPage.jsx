import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate("/profiles");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to authenticate. Check details.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/profiles");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to authenticate with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page flex-center">
      <div className="auth-card fade-in">
        <h1 className="auth-logo">Ani<span>Stream</span></h1>
        <h2>{isLogin ? "Sign In" : "Create Account"}</h2>
        
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div className="auth-divider">or</div>
        <button 
          onClick={handleGoogleLogin} 
          className="btn btn-google btn-block" 
          disabled={loading}
          type="button"
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.02c2.35-2.17 3.7-5.36 3.7-9.04z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.02-3.12c-1.12.75-2.54 1.19-3.91 1.19-3.01 0-5.56-2.03-6.47-4.76H1.4v3.22C3.39 21.57 7.42 24 12 24z" />
            <path fill="#FBBC05" d="M5.53 14.4c-.24-.7-.38-1.45-.38-2.22s.14-1.53.38-2.22V6.74H1.4A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.4 5.37l4.13-3.23z" strokeLinecap="round" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.42 0 3.39 2.43 1.4 6.74l4.13 3.23c.91-2.73 3.46-4.76 6.47-4.76z" />
          </svg>
          Continue with Google
        </button>

        <div className="auth-switch">
          <span>{isLogin ? "New to AniStream?" : "Already have an account?"}</span>
          <button onClick={() => { setIsLogin(!isLogin); setError(""); }}>
            {isLogin ? "Sign up now" : "Sign in here"}
          </button>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('https://s4.anilist.co/file/anilistcdn/media/anime/banner/183231-JFjTqQe3rPCw.jpg');
          background-size: cover;
          background-position: center;
          padding: 20px;
        }
        .auth-card {
          background-color: rgba(20, 20, 20, 0.9);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 3rem 2.5rem;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
        }
        .auth-logo {
          font-size: 2.2rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 2rem;
          letter-spacing: -1.5px;
        }
        .auth-logo span {
          color: var(--primary);
        }
        .auth-card h2 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }
        .auth-error {
          background-color: rgba(229, 9, 20, 0.15);
          border: 1px solid var(--primary);
          color: #ff8080;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .btn-block {
          width: 100%;
          padding: 0.9rem;
          margin-top: 1rem;
        }
        .auth-switch {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 2rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .auth-switch button {
          background: none;
          border: none;
          color: white;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .auth-switch button:hover {
          text-decoration: underline;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 1.5rem 0;
          text-transform: uppercase;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border);
        }
        .auth-divider:not(:empty)::before {
          margin-right: .75em;
        }
        .auth-divider:not(:empty)::after {
          margin-left: .75em;
        }
        .btn-google {
          background-color: white;
          color: #141414;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 600;
          border: 1px solid #ddd;
        }
        .btn-google:hover:not(:disabled) {
          background-color: #f1f1f1;
          color: black;
        }
        .google-icon {
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
