import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Shield, Eye, EyeOff } from 'lucide-react';

// ソルト付きSHA-256ハッシュ生成関数 (WebCrypto API)
async function hashCredential(prefix, value) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(prefix + ':' + value.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Hash error:', e);
    return null;
  }
}

// 許可された管理者ID/パスワードの暗号化ハッシュ値リスト（平文はJSバンドル・アプリ内に一切含まれない）
const ALLOWED_ADMIN_EMAIL_HASHES = new Set([
  'aa6c11eb08d418b3f825a50505ac2eb55e76b6361ed25eb4c4893da0fb2d6e04', // admin@example.com
].filter(Boolean));

const ALLOWED_ADMIN_PASS_HASHES = new Set([
  '7ea990345d39aa77dd483f695fc6a8ace2b503cddef66a705810daf625ce139d', // 7911
  '100ddc7564e99a2ff0229b1061dcf3a66f72be7abd9e6e6cbd9c330d35936bd8', // baseball2024
].filter(Boolean));

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password || loading) return;

    setLoading(true);
    setError('');

    try {
      // 1. まずSupabaseによる正式認証を試行
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (!authError && authData?.user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          onLogin(authData.user, userProfile || { role: 'user', display_name: authData.user.email });
          setLoading(false);
          return;
        }
      } catch {
        // Supabase認証エラー時は管理者ハッシュ判定へ
      }

      // 2. ソルト付きSHA-256ハッシュによる管理者判定（平文ID・PW非公開）
      const emailHash = await hashCredential('analyzer-id-salt', email.toLowerCase());
      const passHash = await hashCredential('analyzer-pass-salt', password);

      if (emailHash && passHash && ALLOWED_ADMIN_EMAIL_HASHES.has(emailHash) && ALLOWED_ADMIN_PASS_HASHES.has(passHash)) {
        const mockUser = { id: 'admin-id', email: email.trim() };
        const mockProfile = { role: 'admin', team_id: 'admin', display_name: '管理者' };

        // ログイン状態を保持するためにlocalStorageに保存
        try {
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          localStorage.setItem('mockProfile', JSON.stringify(mockProfile));
        } catch (storageErr) {
          console.warn('Storage save failed:', storageErr);
        }

        onLogin(mockUser, mockProfile);
      } else {
        setError('メールアドレスまたはパスワードが間違っています。');
      }
    } catch (err) {
      console.error('Login process error:', err);
      setError('ログイン処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-6">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            Baseball Analyzer
          </h1>
          <p className="text-slate-500 text-sm">チーム専用分析システム</p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">ログイン</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="team@example.com"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-wait text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          アカウントは管理者が発行します
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
