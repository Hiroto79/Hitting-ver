import React from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, Database, Cloud, Save, RefreshCw, X } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

function UploadPage({ savantFiles, blastFiles, combinedFiles, updateDataState, setActiveView, saveToCloud, syncState, profile }) {
  const [isLoading, setIsLoading] = React.useState(false);

  const loadFromSupabase = async () => {
    setIsLoading(true);
    const client = getSupabase();

    try {
      const grouped = { savant: [], blast: [], combined: [] };

      // 5000件ずつ（1000件×5並列）を確実に取得するためのヘルパー関数
      const fetchAllRows = async (tableName, teamIdFilter = null) => {
        if (!teamIdFilter && profile?.role !== 'admin') return [];

        let allRows = [];
        let offset = 0;
        let hasMore = true;
        const CHUNK_SIZE = 5; // 5並列 (5000件分)

        while (hasMore) {
          const promises = [];
          for (let i = 0; i < CHUNK_SIZE; i++) {
            const from = offset + (i * 1000);
            const to = from + 999;
            let query = client.from(tableName).select('*').range(from, to).order('created_at', { ascending: false });
            if (teamIdFilter) query = query.eq('team_id', teamIdFilter);
            promises.push(query);
          }

          const results = await Promise.all(promises);
          let addedInThisBatch = 0;
          
          for (const res of results) {
            const data = res.data || [];
            if (data.length > 0) {
              allRows = [...allRows, ...data];
              addedInThisBatch += data.length;
              if (data.length < 1000) {
                hasMore = false;
                break;
              }
            } else {
              hasMore = false;
              break;
            }
          }

          if (hasMore) {
            offset += (CHUNK_SIZE * 1000);
          }
          
          // 最大上限
          if (allRows.length >= 60000) hasMore = false;
        }
        return allRows;
      };

      // 1. Fetch from Unified Table
      const myTeamId = profile?.team_id;
      const unifiedDataRows = await fetchAllRows('baseball_data', myTeamId);
      
      if (unifiedDataRows) {
        unifiedDataRows.forEach(item => {
          let parsedData = [];
          if (item.data) {
            try {
              if (typeof item.data === 'string') {
                const results = Papa.parse(item.data, { header: true, dynamicTyping: true, skipEmptyLines: true });
                parsedData = results.data;
              } else {
                parsedData = Array.isArray(item.data) ? item.data : [];
              }
            } catch (e) { console.error(e); }
          }
          if (grouped[item.type]) {
            // 重複チェック: 同じIDやファイル名がすでにある場合は追加しない
            if (!grouped[item.type].find(f => f.filename === item.filename)) {
              grouped[item.type].push({ id: item.id, filename: item.filename, headers: item.headers, data: parsedData, is_csv: true });
            }
          }
        });
      }

      // 2. Fetch from Specialized Tables
      const fetchSpecialized = async (tableName, type) => {
        const rows = await fetchAllRows(tableName, myTeamId);
        if (!rows || rows.length === 0) return;

        // 1. ファイル名ごとに「最新のアップロードID」を特定する
        const latestUploadIds = {};
        rows.forEach(row => {
          const name = row.file_name || '不明なファイル';
          // order by created_at desc なので、最初に見つかったものが最新
          if (!latestUploadIds[name]) {
            latestUploadIds[name] = row.upload_id;
          }
        });

        // 2. 最新のアップロードIDに一致するデータのみを抽出してグルーピング
        const filesMap = {};
        rows.forEach(row => {
          const name = row.file_name || '不明なファイル';
          // そのファイルの最新アップロード分のみを採用
          if (row.upload_id === latestUploadIds[name]) {
            if (!filesMap[name]) {
              filesMap[name] = {
                id: row.upload_id,
                filename: name,
                headers: Object.keys(row).filter(k => !['id', 'created_at', 'file_name', 'upload_id', 'team_id', 'owner_id', 'updated_at'].includes(k)),
                data: []
              };
            }
            filesMap[name].data.push(row);
          }
        });

        Object.values(filesMap).forEach(file => grouped[type].push(file));
      };

      await fetchSpecialized('savant_data', 'savant');
      await fetchSpecialized('blast_data', 'blast');

      const totalFiles = grouped.savant.length + grouped.blast.length + grouped.combined.length;
      if (totalFiles === 0) {
        alert("クラウドに保存されているデータが見つかりませんでした。");
        return;
      }

      updateDataState('savant', grouped.savant, 'set');
      updateDataState('blast', grouped.blast, 'set');
      updateDataState('combined', grouped.combined, 'set');
      
      alert(`${totalFiles} 個のファイルを同期しました。分析画面へ移動します。`);
      setActiveView('team');
    } catch (err) {
      console.error(err);
      alert("同期に失敗しました:\n" + (err.message || "Unknown Error"));
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

        updateDataState(type, {
          filename: file.name,
          headers: headers,
          data: results.data
        }, 'add');
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        alert("CSVの読み込みに失敗しました。");
      }
    });
  };

  const renderDataView = (files, typeLabel) => {
    if (!files || files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 text-slate-400">
          <UploadCloud className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm font-bold">データ未アップロード</p>
          <p className="text-xs opacity-75 mt-1 text-center px-4">CSVファイルを選択するか、<br/>クラウドから同期してください</p>
        </div>
      );
    }

    const totalRows = files.reduce((acc, f) => acc + (f.data ? f.data.length : 0), 0);

    return (
      <div className="flex flex-col h-48 border border-emerald-500/30 rounded-xl bg-emerald-900/10 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-emerald-400 mr-2" />
            <span className="text-sm font-bold text-emerald-300">読込完了 ({files.length} ファイル)</span>
          </div>
          <button 
            onClick={() => files.forEach(f => saveToCloud(typeLabel.toLowerCase(), f))}
            disabled={syncState.saving}
            className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              syncState.saving ? 'bg-slate-700 text-slate-500 cursor-wait' : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${syncState.saving ? 'animate-pulse' : ''}`} />
            保存
          </button>
        </div>
        
        <div className="text-xs text-slate-300 mb-2 flex-1 overflow-y-auto pr-2 space-y-1">
          {files.map((f, idx) => (
            <div key={idx} className="bg-slate-800/50 px-2 py-1.5 rounded truncate border border-slate-700/50 flex justify-between items-center group">
              <span className="truncate mr-2">{f.filename}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">{f.data?.length || 0}行</span>
                <button 
                  onClick={() => updateDataState(typeLabel.toLowerCase(), idx, 'remove')}
                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                  title="このファイルを削除"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-slate-400 mt-auto font-bold bg-slate-900/50 p-2 rounded-lg border border-slate-700 flex justify-between items-center">
          <span>合計データ数</span>
          <span className="text-white text-sm">{totalRows} <span className="text-xs text-slate-400 font-normal">行</span></span>
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
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Cloud className="w-4 h-4 text-blue-400" />
            クラウド同期
          </div>
          <button 
            onClick={loadFromSupabase}
            disabled={isLoading}
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
          {renderDataView(savantFiles, 'savant')}
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
          {renderDataView(blastFiles, 'blast')}
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
          {renderDataView(combinedFiles, 'combined')}
        </div>
      </div>

      {savantFiles.length > 0 && (
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
