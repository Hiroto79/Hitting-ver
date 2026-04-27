import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Trash2, Shield, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', team_id: '', role: 'user', display_name: '' });
  const [message, setMessage] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at');
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const addUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create Auth User
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
      });
      if (error) throw error;

      // 2. Update Profile (team_id, role, etc)
      const { error: profileError } = await supabase.from('profiles').update({
        team_id: newUser.team_id,
        role: newUser.role,
        display_name: newUser.display_name || newUser.email,
      }).eq('id', data.user.id);
      
      if (profileError) throw profileError;

      setMessage({ type: 'success', text: `${newUser.email} を追加しました。` });
      setShowAdd(false);
      setNewUser({ email: '', password: '', team_id: '', role: 'user', display_name: '' });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: `エラー: ${err.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const updateTeam = async (userId, team_id) => {
    await supabase.from('profiles').update({ team_id }).eq('id', userId);
    fetchUsers();
  };

  const deleteUser = async (userId, email) => {
    if (!confirm(`${email} を削除しますか？`)) return;
    try {
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('profiles').delete().eq('id', userId);
      fetchUsers();
    } catch (err) {
      alert("削除失敗: " + err.message);
    }
  };

  const existingTeams = [...new Set(users.map(u => u.team_id).filter(Boolean))];

  return (
    <div className="animate-in fade-in duration-300">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            管理者パネル
          </h2>
          <p className="text-slate-400">ユーザーの追加・削除・チーム割り当てを管理します。</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          ユーザー追加
        </button>
      </header>

      {message && (
        <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Add User Form */}
      {showAdd && (
        <div className="bg-slate-800/80 border border-purple-500/30 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-white mb-4">新規ユーザー追加</h3>
          <form onSubmit={addUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">表示名</label>
              <input value={newUser.display_name} onChange={e => setNewUser({...newUser, display_name: e.target.value})}
                placeholder="例：チームA監督" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">メールアドレス（ID）*</label>
              <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                placeholder="team@example.com" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">パスワード *</label>
              <input type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                placeholder="6文字以上" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">チーム (入力または選択)</label>
              <input 
                list="team-list"
                value={newUser.team_id} 
                onChange={e => setNewUser({...newUser, team_id: e.target.value})}
                placeholder="チーム名"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" 
              />
              <datalist id="team-list">
                {existingTeams.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">権限</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500">
                <option value="user">チームユーザー</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all">
                {loading ? '追加中...' : '追加'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User List */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white">ユーザー一覧 ({users.length}人)</h3>
          </div>
          <button onClick={fetchUsers} className="text-slate-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="divide-y divide-slate-700">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{user.display_name || user.email}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <div className="relative">
                <input
                  list="team-list"
                  value={user.team_id || ''}
                  onChange={e => updateTeam(user.id, e.target.value)}
                  placeholder="チーム未割当"
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none w-32"
                />
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                user.role === 'admin' ? 'bg-purple-600/30 text-purple-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {user.role === 'admin' ? 'ADMIN' : 'USER'}
              </span>
              <button onClick={() => deleteUser(user.id, user.email)}
                className="text-slate-600 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {users.length === 0 && !loading && (
            <div className="px-6 py-12 text-center text-slate-500">
              ユーザーがいません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
