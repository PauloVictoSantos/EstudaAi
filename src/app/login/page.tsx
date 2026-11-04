'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Brand, ThemeButton, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { ease, item, Stagger } from '@/components/motion';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''), [pw, setPw] = useState('');
  const [errs, setErrs] = useState<{ email?: string; pw?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (create: boolean) => {
    const e: typeof errs = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Informe um e-mail válido.';
    if (pw.length < 8) e.pw = 'A senha tem pelo menos 8 caracteres.';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await api<{ hasExam: boolean }>('/api/auth/login', { method: 'POST', json: { email, password: pw, create } });
      router.push(r.hasExam ? '/prova' : '/onboarding');
    } catch (err) { setErrs({ form: (err as Error).message }); setBusy(false); }
  };

  const err = (m?: string, id?: string) => (
    <AnimatePresence>{m && <motion.p id={id} role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-accent-700)' }}>{m}</motion.p>}</AnimatePresence>
  );

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-4)' }}><Brand /><ThemeButton /></header>
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', maxWidth: 960, width: '100%', margin: '0 auto' }}>
        <Stagger as="section" style={{ padding: 'var(--space-8) var(--space-4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 'var(--space-3)' }} delay={0.08}>
          <motion.span variants={item} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: 'var(--color-accent-100)', color: 'var(--color-accent-800)', fontSize: 12 }}>
            <Icon name="graduation-cap" size={14} />ENEM · Concursos · Outras provas
          </motion.span>
          <motion.h1 variants={item} style={{ margin: 0, fontSize: 'clamp(34px,8vw,56px)', textWrap: 'balance' }}>Estude no seu ritmo. Chegue calmo no dia da prova.</motion.h1>
          <motion.p variants={item} className="text-muted" style={{ maxWidth: '40ch' }}>Questões reais das provas anteriores que se ajustam ao seu nível, redação corrigida enquanto você escreve e um plano semanal até a data da prova.</motion.p>
        </Stagger>
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.2 }} noValidate onSubmit={e => { e.preventDefault(); submit(false); }}
          style={{ padding: 'var(--space-8) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', justifyContent: 'flex-end' }}>
          <h3 style={{ margin: 0 }}>Entrar</h3>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!errs.email} aria-describedby="email-err" style={{ minHeight: 44 }} />
            {err(errs.email, 'email-err')}
          </div>
          <div className="field">
            <label htmlFor="pw">Senha</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} style={{ minHeight: 44 }} />
            {err(errs.pw)}
          </div>
          {err(errs.form)}
          <motion.button whileTap={{ scale: 0.98 }} className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ minHeight: 48, justifyContent: 'space-between' }}>
            {busy ? 'Entrando…' : 'Entrar'} <Icon name="arrow-right" />
          </motion.button>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Sem conta? <a href="#" onClick={e => { e.preventDefault(); submit(true); }}>Criar conta com este e-mail</a></p>
        </motion.form>
      </main>
    </>
  );
}
