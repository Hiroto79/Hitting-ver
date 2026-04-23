import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase, getSupabase } from '../lib/supabase';
import { Database, Trash2, RefreshCw, HardDrive, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

function CloudDataManager({ updateDataState }) {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (supabaseKey) {
      fetchDatasets();
    }
  }, []);

  const fetchDatasets = async () => {
    if (!supabaseKey) return;
    setLoading(true);
    const client = getSupabase(supabaseKey);
    try {
      const { data, error } = await client.from('baseball_data').select('type, filename, updated_at, is_csv').order('updated_at', { ascending: false });
      if (error) throw error;
      setDatasets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncKey = () => {
    localStorage.setItem('supabase_anon_key', supabaseKey);
    fetchDatasets();
    alert("APIキーを更新し、同期しました。");
  };

  const deleteDataset = async (type) => {
    if (!window.confirm(`${type} データを削除してもよろしいですか？`)) return;
    
    const client = getSupabase(supabaseKey);
    try {
      const { error } = await client.from('baseball_data').delete().eq('type', type);
      if (error) throw error;
      
      // Clear local state too
      updateDataState(type, null);
      
      fetchDatasets();
      alert("削除しました。");
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました。");
    }
  };

  const loadOne = async (type) => {
    setLoading(true);
    const client = getSupabase(supabaseKey);
    try {
      const { data, error } = await client.from('baseball_data').select('*').eq('type', type).single();
      if (error) throw error;
      
      const payload = { filename: data.filename, headers: data.headers, data: data.data, is_csv: data.is_csv };
      updateDataState(type, payload);
      
      alert(`${type} を読み込みました。`);
    } catch (err) {
      console.error(err);
      alert("読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center">
          <HardDrive className="w-8 h-8 mr-3 text-blue-400" />
          クラウドデータ管理
        </h2>
        <p className="text-slate-400">サーバーに保存されているデータの確認・削除・読込を行います。</p>
      </header>

      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 mb-8">
        <div className="flex items-center justify-between mb-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Supabase API Key (Anon Key)
          </label>
          {supabaseKey && (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> Configured
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="APIキーを入力..."
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
            />
            <button 
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleSyncKey}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '同期中...' : '同期'}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          ※一度設定すれば保存されます。変更が必要な場合のみ編集してください。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['savant', 'blast', 'combined'].map(type => {
          const dataset = datasets.find(d => d.type === type);
          return (
            <div key={type} className={`p-6 rounded-3xl border transition-all ${dataset ? 'bg-slate-800 border-slate-600 shadow-xl' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                  type === 'savant' ? 'bg-blue-600' : type === 'blast' ? 'bg-purple-600' : 'bg-emerald-600'
                }`}>
                  {type}
                </span>
                {dataset ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-slate-700" />
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1 truncate">
                {dataset ? dataset.filename : 'データ未保存'}
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                {dataset ? `最終更新: ${new Date(dataset.updated_at).toLocaleString()}` : 'クラウドに保存されていません'}
              </p>

              <div className="flex gap-2">
                {dataset ? (
                  <>
                    <button 
                      onClick={() => loadOne(type)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      読込
                    </button>
                    <button 
                      onClick={() => deleteDataset(type)}
                      className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2.5 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-slate-600 italic py-2">
                    「データ読み込み」からアップロード可能です
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {datasets.length === 0 && !loading && (
        <div className="mt-12 text-center py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl">
          <Database className="w-12 h-12 mx-auto mb-4 text-slate-700" />
          <p className="text-slate-500">保存されたデータが見つかりません。APIキーを確認してください。</p>
        </div>
      )}
    </div>
  );
}

export default CloudDataManager;
