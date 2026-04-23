import React from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, Database, Cloud, Save, RefreshCw } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

function UploadPage({ savantData, setSavantData, blastData, setBlastData, combinedData, setCombinedData, setActiveView, saveToCloud, syncState }) {
  const [supabaseKey, setSupabaseKey] = React.useState(localStorage.getItem('supabase_anon_key') || '');
  const [isLoading, setIsLoading] = React.useState(false);

  const loadFromSupabase = async () => {
    if (!supabaseKey) return;
    setIsLoading(true);
    localStorage.setItem('supabase_anon_key', supabaseKey);
    const client = getSupabase(supabaseKey);

    try {
      const { data, error } = await client.from('baseball_data').select('*');
      if (error) throw error;

      // Group by type to merge multiple files of the same type
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = { filename: 'Merged Data', headers: item.headers, data: [], is_csv: item.is_csv };
        
        // Handle parsing if it's still a string (though updateDataState will do it too, 
        // we merge first to avoid multiple parse calls)
        let itemData = item.data;
        if (item.is_csv && typeof item.data === 'string') {
          const results = Papa.parse(item.data, { header: true, dynamicTyping: true, skipEmptyLines: true });
          itemData = results.data;
        }
        
        acc[item.type].data = [...acc[item.type].data, ...(Array.isArray(itemData) ? itemData : [])];
        return acc;
      }, {});

      if (grouped.savant) setSavantData(grouped.savant);
      if (grouped.blast) setBlastData(grouped.blast);
      if (grouped.combined) setCombinedData(grouped.combined);
      
      if (data.length > 0) alert(`${data.length} 個のファイルをマージして読み込みました。`);
    } catch (err) {
      console.error(err);
      alert("読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields;
        const isSavant = headers.includes('launch_speed') || headers.includes('player_name') || headers.includes('batter');
        const isBlast = headers.some(h => h.includes('オンプレーン') || h.includes('バットスピード'));

        if (type === 'savant' && isBlast && !isSavant) {
          alert("警告: BlastデータがSavantスロットにアップロードされた可能性があります。列名を確認してください。");
        } else if (type === 'blast' && isSavant && !isBlast) {
          alert("警告: SavantデータがBlastスロットにアップロードされた可能性があります。");
        }

        if (type === 'savant') {
          setSavantData({
            filename: file.name,
            headers: headers,
            data: results.data
          });
        } else if (type === 'blast') {
          setBlastData({
            filename: file.name,
            headers: headers,
            data: results.data
          });
        } else if (type === 'combined') {
          setCombinedData({
            filename: file.name,
            headers: headers,
            data: results.data
          });
        }
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        alert("CSVの読み込みに失敗しました。");
      }
    });
  };

  const renderDataView = (dataObj, title) => {
    if (!dataObj) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 text-slate-400">
          <UploadCloud className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">ここに{title}のCSVファイルをアップロードしてください</p>
        </div>
      );
    }

    return (
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-md">
        <div className="flex items-center space-x-3 mb-4 border-b border-slate-700 pb-4">
          <FileText className="text-blue-400 w-6 h-6" />
          <h2 className="text-lg font-bold text-white flex-1 truncate">{dataObj.filename}</h2>
          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${title === 'Savant' ? 'bg-blue-600' : title === 'Blast' ? 'bg-purple-600' : 'bg-emerald-600'}`}>
            {dataObj.data.length.toLocaleString()} 行
          </span>
        </div>
        
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center">
            <Database className="w-4 h-4 mr-2" />
            読み込まれた列名（一部）
          </h3>
          <div className="flex flex-wrap gap-1.5 h-16 overflow-hidden relative">
            {dataObj.headers.slice(0, 15).map((header, idx) => (
              <span key={idx} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs border border-slate-600 truncate max-w-[150px]">
                {header}
              </span>
            ))}
            {dataObj.headers.length > 15 && (
              <div className="absolute bottom-0 right-0 bg-gradient-to-l from-slate-800 w-16 h-full flex items-end justify-end">
                <span className="text-xs text-slate-400 font-bold bg-slate-800 pl-2">+{dataObj.headers.length - 15} more</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => saveToCloud(title.toLowerCase(), dataObj)}
            disabled={syncState.saving}
            className={`flex-1 flex items-center justify-center gap-2 border py-2 rounded-lg text-xs font-bold transition-all ${
              syncState.saving ? 'bg-slate-700 border-slate-600 text-slate-500 cursor-wait' : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${syncState.saving ? 'animate-pulse' : ''}`} />
            {syncState.saving ? '保存中...' : 'クラウド保存'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-2">データ管理</h2>
          <p className="text-slate-400">CSVアップロードまたはクラウド(Supabase)からデータを同期します。</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3 w-full md:min-w-[300px] md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Cloud className="w-4 h-4 text-blue-400" />
            Supabase 同期
          </div>
          <input 
            type="password" 
            placeholder="Supabase Anon Key を入力" 
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            onClick={loadFromSupabase}
            disabled={isLoading || !supabaseKey}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
            クラウドから一括読込
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        {/* Savant Card */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <span className="bg-blue-500 w-3 h-6 rounded-full mr-3"></span>
              Savant Data
            </h3>
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
              ファイルを選択
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'savant')} />
            </label>
          </div>
          {renderDataView(savantData, 'Savant')}
        </div>

        {/* Blast Card */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <span className="bg-purple-500 w-3 h-6 rounded-full mr-3"></span>
              Blast Data
            </h3>
            <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/20">
              ファイルを選択
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'blast')} />
            </label>
          </div>
          {renderDataView(blastData, 'Blast')}
        </div>

        {/* Combined Card */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <span className="bg-emerald-500 w-3 h-6 rounded-full mr-3"></span>
              Combined Data (Future)
            </h3>
            <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20">
              ファイルを選択
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'combined')} />
            </label>
          </div>
          {renderDataView(combinedData, 'Combined')}
        </div>
      </div>

      {savantData && (
        <div className="mt-10 p-6 bg-blue-900/20 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h4 className="text-lg font-bold text-blue-100 mb-1">データの準備ができました！</h4>
            <p className="text-blue-300 text-sm">左側のメニューから「チーム分析」や「個人成績」に進んでください。</p>
          </div>
          <button 
            onClick={() => setActiveView('team')}
            className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-transform transform hover:scale-105"
          >
            チーム分析を見る
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
