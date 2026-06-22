import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";

export default function AuthModal({ onClose }) {
  const { showToast } = useToast();
  const { refreshProfile } = useApp() ?? {};
  const { t } = useTranslation();

  const [mode, setMode]         = useState("login");
  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState("");
  const [otpCode, setOtpCode]   = useState("");
  const [name, setName]         = useState("");
  const [handle, setHandle]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function switchMode(m) { setMode(m); setError(""); setMessage(""); setHandle(""); setStep(1); setOtpCode(""); }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/`, queryParams: { access_type: "offline", prompt: "consent" } },
    });
  }

  async function handleSendOtp() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    });
    if (error) { setError(error.message); }
    else { setStep(2); setMessage(t("auth.otpSent")); }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "email" });
    if (error) { setError(error.message); }
    else { setStep(3); setMessage(""); }
    setLoading(false);
  }

  async function handleComplete(e) {
    e.preventDefault();
    setError(""); setLoading(true);

    if (password) {
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) { setError(pwErr.message); setLoading(false); return; }
    }

    const { data: existing } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
    if (existing) { setError(t("auth.usernameTaken")); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, username: name || email.split("@")[0], handle, bio: "", avatar_url: null }, { onConflict: "id" });
    }

    await refreshProfile?.();
    showToast("회원가입 성공! 환영합니다", "success", undefined, "sparkle");
    onClose();
    setLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); }
    else if (data.session) { showToast("로그인 성공!", "success", undefined, "check"); onClose(); }
    setLoading(false);
  }

  const INPUT_STYLE = { width:"100%", height:52, borderRadius:999, border:"1px solid rgba(255,255,255,0.16)", background:"rgba(255,255,255,0.07)", color:"#fff", padding:"0 20px", fontSize:15, fontFamily:"inherit", outline:"none", boxSizing:"border-box", transition:"border-color 200ms" };
  const BTN_STYLE = { width:"100%", height:54, marginTop:20, border:"none", borderRadius:999, cursor:loading?"not-allowed":"pointer", background:"#FC3C44", color:"#fff", fontSize:15, fontWeight:700, letterSpacing:"-0.015em", fontFamily:"inherit", transition:"filter 200ms, transform 120ms" };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,0.72)", display:"grid", placeItems:"center", padding:"32px 20px" }}>
      <style>{`
        .auth-inp::placeholder{color:rgba(255,255,255,0.35);}
        .auth-inp:focus{border-color:#fff!important;}
        .auth-soc:hover{background:rgba(255,255,255,0.05)!important;border-color:rgba(255,255,255,0.28)!important;}
        @keyframes authIn{from{opacity:0;transform:scale(0.97) translateY(8px);}to{opacity:1;transform:none;}}
      `}</style>

      <div onClick={e=>e.stopPropagation()} style={{ position:"relative", width:"100%", maxWidth:436, borderRadius:24, background:"#1c1c1f", boxShadow:"0 40px 120px -24px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.06)", padding:"40px 40px 36px", animation:"authIn 260ms cubic-bezier(0.16,1,0.3,1) both", overflow:"hidden" }}>

        <button onClick={onClose} style={{ position:"absolute", top:18, right:18, width:34, height:34, border:"none", background:"none", cursor:"pointer", borderRadius:999, display:"grid", placeItems:"center", color:"rgba(255,255,255,0.72)", transition:"background 200ms, color 200ms" }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.72)";}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h1 style={{ margin:"6px 0 0", textAlign:"center", fontSize:26, fontWeight:700, letterSpacing:"-0.02em", color:"#fff" }}>
          Welcome <span style={{ fontFamily:"'Carter One', cursive", color:"#F54D4D", fontWeight:400, letterSpacing:"0.01em" }}>Bridge</span>
        </h1>
        <p style={{ margin:"14px auto 0", maxWidth:300, textAlign:"center", fontSize:14, color:"rgba(255,255,255,0.72)", lineHeight:1.5, wordBreak:"break-word", overflowWrap:"break-word" }}>
          {t("auth.tagline")}
        </p>

        {/* 소셜 */}
        <div style={{ display:"flex", flexDirection:"column", gap:11, marginTop:32 }}>
          <button className="auth-soc" onClick={handleGoogle} style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", height:52, borderRadius:999, background:"transparent", border:"1px solid rgba(255,255,255,0.16)", color:"#fff", cursor:"pointer", fontSize:14, fontWeight:600, letterSpacing:"-0.015em", transition:"background 200ms, border-color 200ms", fontFamily:"inherit", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", paddingLeft:52, paddingRight:16 }}>
            <span style={{ position:"absolute", left:20, top:"50%", transform:"translateY(-50%)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            </span>
            {t("auth.continueWithGoogle")}
          </button>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:16, margin:"24px 0", color:"rgba(255,255,255,0.44)", fontSize:13 }}>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }} />
          {t("auth.or")}
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }} />
        </div>

        {/* 로그인 */}
        {mode === "login" && (
          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <input className="auth-inp" type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={e=>setEmail(e.target.value)} required style={INPUT_STYLE} />
            <div style={{ position:"relative" }}>
              <input className="auth-inp" type={showPw?"text":"password"} placeholder={t("auth.passwordPlaceholder")} value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} style={{ ...INPUT_STYLE, paddingRight:50 }} />
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", width:36, height:36, border:"none", background:"none", cursor:"pointer", display:"grid", placeItems:"center", color:"rgba(255,255,255,0.44)" }}>
                {showPw ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                         : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {error && <div style={{ padding:"10px 16px", borderRadius:12, background:"rgba(252,60,68,0.1)", border:"1px solid rgba(252,60,68,0.2)", color:"#fc8086", fontSize:13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={BTN_STYLE}
              onMouseEnter={e=>{if(!loading)e.currentTarget.style.filter="brightness(1.08)";}}
              onMouseLeave={e=>e.currentTarget.style.filter="none"}>
              {loading ? t("auth.loginLoading") : t("auth.login")}
            </button>
          </form>
        )}

        {/* 회원가입 step 1: 이메일 */}
        {mode === "signup" && step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <input className="auth-inp" type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={e=>setEmail(e.target.value)} style={INPUT_STYLE} />
            {error && <div style={{ padding:"10px 16px", borderRadius:12, background:"rgba(252,60,68,0.1)", border:"1px solid rgba(252,60,68,0.2)", color:"#fc8086", fontSize:13 }}>{error}</div>}
            <button onClick={handleSendOtp} disabled={loading || !email} style={{ ...BTN_STYLE, opacity: !email ? 0.5 : 1 }}
              onMouseEnter={e=>{if(!loading&&email)e.currentTarget.style.filter="brightness(1.08)";}}
              onMouseLeave={e=>e.currentTarget.style.filter="none"}>
              {loading ? t("auth.sending") : t("auth.sendCode")}
            </button>
          </div>
        )}

        {/* 회원가입 step 2: 코드 확인 */}
        {mode === "signup" && step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {message && <div style={{ padding:"10px 16px", borderRadius:12, background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.2)", color:"#4ade80", fontSize:13 }}>{message}</div>}
            <input className="auth-inp" type="text" placeholder={t("auth.codePlaceholder")} value={otpCode} onChange={e=>setOtpCode(e.target.value)} style={INPUT_STYLE} />
            {error && <div style={{ padding:"10px 16px", borderRadius:12, background:"rgba(252,60,68,0.1)", border:"1px solid rgba(252,60,68,0.2)", color:"#fc8086", fontSize:13 }}>{error}</div>}
            <button onClick={handleVerifyOtp} disabled={loading || !otpCode} style={{ ...BTN_STYLE, opacity: !otpCode ? 0.5 : 1 }}
              onMouseEnter={e=>{if(!loading&&otpCode)e.currentTarget.style.filter="brightness(1.08)";}}
              onMouseLeave={e=>e.currentTarget.style.filter="none"}>
              {loading ? t("auth.verifying") : t("auth.verify")}
            </button>
            <button onClick={()=>{setStep(1);setError("");setMessage("");}} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.44)", fontSize:13, cursor:"pointer", fontFamily:"inherit", marginTop:4, transition:"color 150ms" }}
              onMouseEnter={e=>e.currentTarget.style.color="#fff"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.44)"}>
              {t("auth.changeEmail")}
            </button>
          </div>
        )}

        {/* 회원가입 step 3: 정보 입력 */}
        {mode === "signup" && step === 3 && (
          <form onSubmit={handleComplete} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <input className="auth-inp" type="text" placeholder={t("auth.namePlaceholder")} value={name} onChange={e=>setName(e.target.value)} style={INPUT_STYLE} />
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:20, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.5)", fontSize:15, pointerEvents:"none" }}>@</span>
              <input className="auth-inp" type="text" placeholder={t("auth.usernamePlaceholder")} value={handle} onChange={e=>setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g,""))} required style={{ ...INPUT_STYLE, paddingLeft:36 }} />
            </div>
            <div style={{ position:"relative" }}>
              <input className="auth-inp" type={showPw?"text":"password"} placeholder={t("auth.passwordOptionalPlaceholder")} value={password} onChange={e=>setPassword(e.target.value)} style={{ ...INPUT_STYLE, paddingRight:50 }} />
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", width:36, height:36, border:"none", background:"none", cursor:"pointer", display:"grid", placeItems:"center", color:"rgba(255,255,255,0.44)" }}>
                {showPw ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                         : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {error && <div style={{ padding:"10px 16px", borderRadius:12, background:"rgba(252,60,68,0.1)", border:"1px solid rgba(252,60,68,0.2)", color:"#fc8086", fontSize:13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={BTN_STYLE}
              onMouseEnter={e=>{if(!loading)e.currentTarget.style.filter="brightness(1.08)";}}
              onMouseLeave={e=>e.currentTarget.style.filter="none"}>
              {loading ? t("auth.saving") : t("auth.done")}
            </button>
          </form>
        )}

        <p style={{ margin:"20px auto 0", textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.44)", lineHeight:1.5 }}>
          {mode==="login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
          <a onClick={()=>switchMode(mode==="login"?"signup":"login")} style={{ color:"rgba(255,255,255,0.9)", fontWeight:600, textDecoration:"underline", cursor:"pointer" }}>
            {mode==="login" ? t("auth.signup") : t("auth.login")}
          </a>
        </p>

      </div>
    </div>
  );
}
