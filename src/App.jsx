import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import Sidebar from './components/Sidebar';
import UploadPage from './pages/UploadPage';
import TeamAnalysis from './pages/TeamAnalysis';
import PlayerAnalysis from './pages/PlayerAnalysis';
import CustomCharts from './pages/CustomCharts';
import GameStats from './pages/GameStats';
import CloudDataManager from './pages/CloudDataManager';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import './App.css';

import { supabase, getSupabase } from './lib/supabase';
import { saveDatasetToLocalDB, getDatasetFromLocalDB, clearLocalDB } from './lib/db';

function App() {
  const [savantFiles, setSavantFiles] = useState([]);
  const [blastFiles, setBlastFiles] = useState([]);
  const [combinedFiles, setCombinedFiles] = useState([]);
  const [activeView, setActiveView] = useState('upload');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [analysisState, setAnalysisState] = useState({ team: '', player: '' });

  // Auth state
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Global saving state
  const [syncState, setSyncState] = useState({ saving: false, lastError: null, lastSuccess: null });

  // Check auth on mount
  useEffect(() => {
    // 1. Check local storage for mock session first
    const savedUser = localStorage.getItem('mockUser');
    const savedProfile = localStorage.getItem('mockProfile');
    
    if (savedUser && savedProfile) {
      setUser(JSON.parse(savedUser));
      setProfile(JSON.parse(savedProfile));
      setAuthLoading(false);
      return;
    }

    // 2. Otherwise try Supabase
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          supabase.from('profiles').select('*').eq('id', session.user.id).single()
            .then(({ data }) => { setProfile(data); setAuthLoading(false); })
            .catch(() => setAuthLoading(false));
        } else {
          setAuthLoading(false);
        }
      })
      .catch((err) => {
        console.error('Auth check failed:', err);
        setAuthLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load cached data from IndexedDB when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      const loadCachedData = async () => {
        const cachedSavant = await getDatasetFromLocalDB('savant') || [];
        const cachedBlast = await getDatasetFromLocalDB('blast') || [];
        const cachedCombined = await getDatasetFromLocalDB('combined') || [];
        
        const ensureArray = (data) => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          // Removed legacy restoration logic to clean up unwanted small datasets
          return [];
        };
        
        setSavantFiles(ensureArray(cachedSavant));
        setBlastFiles(ensureArray(cachedBlast));
        setCombinedFiles(ensureArray(cachedCombined));
      };
      loadCachedData();
    }
  }, [user, authLoading]);

  const handleLogin = (u, p) => { setUser(u); setProfile(p); };

  const handleLogout = async () => {
    // Clear mock session
    localStorage.removeItem('mockUser');
    localStorage.removeItem('mockProfile');
    
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setUser(null); setProfile(null);
    setSavantFiles([]); setBlastFiles([]); setCombinedFiles([]);
    await clearLocalDB();
  };

  const saveToCloud = async (type, dataObj) => {
    if (!dataObj || !dataObj.data) {
      alert("保存するデータがありません。");
      return;
    }

    setSyncState(prev => ({ ...prev, saving: true, lastError: null }));
    const client = getSupabase();
    
    const table = type === 'savant' ? 'savant_data' : (type === 'blast' ? 'blast_data' : 'baseball_data');

    // Define allowed columns
    const SAVANT_COLUMNS = [
      'game_date', 'pitcher_name', 'batter_name', 'pitch_name', 'release_speed', 'release_spin_rate', 
      'launch_speed', 'launch_angle', 'hit_distance_sc', 'events', 'description', 'zone', 'stand', 
      'p_throws', 'home_team', 'away_team', 'type', 'hit_location', 'bb_type', 'balls', 'strikes', 
      'game_year', 'pfx_x', 'pfx_z', 'plate_x', 'plate_z', 'on_3b', 'on_2b', 'on_1b', 
      'outs_when_up', 'inning', 'inning_topbot', 'hc_x', 'hc_y', 'vx0', 'vy0', 'vz0', 
      'ax', 'ay', 'az', 'sz_top', 'sz_bot', 'effective_speed', 'release_extension', 
      'game_pk', 'spin_axis', 'delta_home_win_exp', 'delta_run_exp', 'file_name', 'upload_id'
    ];
    
    const BLAST_COLUMNS = [
      'date', 'player_name', 'bat_speed', 'attack_angle', 'vertical_bat_angle', 'power', 
      'time_to_contact', 'peak_hand_speed', 'on_plane_efficiency', 'rotation_score', 
      'on_plane_score', 'connection_score', 'rotation_acceleration', 'connection_at_impact', 
      'connection_at_address', 'bat_angle', 'file_name', 'upload_id'
    ];

    const allowedColumns = table === 'savant_data' ? SAVANT_COLUMNS : (table === 'blast_data' ? BLAST_COLUMNS : []);

    try {
      const dataArray = Array.isArray(dataObj.data) ? dataObj.data : [];
      const totalRows = dataArray.length;
      const batchSize = 1000;
      const uploadId = dataObj.id || `up-${Date.now()}`;

      if (totalRows > 50000) {
        alert(`${totalRows.toLocaleString()}行のデータを保存します。しばらくお待ちください。`);
      }

      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = dataArray.slice(i, i + batchSize).map(row => {
          const filteredRow = {};
          if (allowedColumns.length > 0) {
            allowedColumns.forEach(col => {
              if (row[col] !== undefined) filteredRow[col] = row[col];
              if (col === 'file_name' && row.filename) filteredRow.file_name = row.filename;
              if (col === 'game_date' && row.date) filteredRow.game_date = row.date;
            });
          } else {
            Object.assign(filteredRow, row);
          }
          return {
            ...filteredRow,
            file_name: dataObj.filename,
            upload_id: uploadId,
            team_id: profile?.team_id,
            owner_id: profile?.id,
            updated_at: new Date().toISOString()
          };
        });

        const { error } = await client.from(table).insert(batch);
        if (error) throw error;
      }
      
      alert(`「${dataObj.filename}」をクラウドに保存しました！`);
      setSyncState(prev => ({ ...prev, saving: false, lastSuccess: 'Saved!' }));
    } catch (err) {
      console.error(err);
      const msg = err.message || "保存失敗。形式を自動調整しましたがエラーが発生しました。";
      alert("保存エラー: " + msg);
      setSyncState(prev => ({ ...prev, saving: false, lastError: msg }));
    }
  };

  const updateDataState = async (type, payload, action = 'set') => {
    let setter, currentFiles;
    if (type === 'savant') { setter = setSavantFiles; currentFiles = savantFiles; }
    if (type === 'blast') { setter = setBlastFiles; currentFiles = blastFiles; }
    if (type === 'combined') { setter = setCombinedFiles; currentFiles = combinedFiles; }
    
    let newFiles = [...currentFiles];

    if (action === 'set') {
      newFiles = payload || [];
    } else if (action === 'add') {
      let finalData = payload.data;
      if (typeof payload.data === 'string' && payload.is_csv) {
        try {
          const results = Papa.parse(payload.data, { header: true, dynamicTyping: true, skipEmptyLines: true });
          finalData = results.data;
        } catch (e) { console.error('Parse error:', e); }
      }
      const processed = { ...payload, data: finalData, id: payload.id || crypto.randomUUID() };
      newFiles.push(processed);
    } else if (action === 'remove') {
      if (typeof payload === 'number') {
        newFiles.splice(payload, 1);
      } else {
        newFiles = newFiles.filter(f => f.id !== payload);
      }
    }

    setter(newFiles);
    await saveDatasetToLocalDB(type, newFiles);
  };

  // Helper to merge multiple files into one dataset for analysis views
  const mergeFiles = (files) => {
    // If it's the new array format
    if (Array.isArray(files) && files.length > 0) {
      return {
        headers: files[0].headers,
        data: files.flatMap(f => f.data)
      };
    }
    // If it's the old single-object format (for backward compatibility)
    if (files && files.headers && files.data) {
      return files;
    }
    return null;
  };

  const savantData = useMemo(() => mergeFiles(savantFiles), [savantFiles]);
  const blastData = useMemo(() => mergeFiles(blastFiles), [blastFiles]);
  const combinedData = useMemo(() => mergeFiles(combinedFiles), [combinedFiles]);

  const renderActiveView = () => {
    const uploadProps = {
      savantFiles, blastFiles, combinedFiles, updateDataState,
      setActiveView, saveToCloud, syncState, profile
    };
    switch (activeView) {
      case 'upload':   return <UploadPage {...uploadProps} />;
      case 'team':     return <TeamAnalysis savantData={savantData} blastData={blastData} combinedData={combinedData} onViewPlayer={(player, team) => { setAnalysisState({ player, team }); setActiveView('player'); }} />;
      case 'player':   return <PlayerAnalysis savantData={savantData} blastData={blastData} initialPlayer={analysisState.player} initialTeam={analysisState.team} />;
      case 'game':     return <GameStats savantData={savantData} blastData={blastData} combinedData={combinedData} />;
      case 'custom':   return <CustomCharts savantData={savantData} blastData={blastData} combinedData={combinedData} />;
      case 'cloud':    return <CloudDataManager updateDataState={updateDataState} profile={profile} />;
      case 'admin':    return profile?.role === 'admin' ? <AdminPanel /> : null;
      default:         return <UploadPage {...uploadProps} />;
    }
  };

  const handleViewChange = (view) => { setActiveView(view); setIsMenuOpen(false); };

  // Loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">読み込み中...</div>
      </div>
    );
  }

  // Not logged in → show login
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="main-layout">
      {isMenuOpen && <div className="sidebar-overlay" onClick={() => setIsMenuOpen(false)} />}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center px-6 justify-between">
        <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Baseball Analyzer
        </h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-300 hover:text-white">
          {isMenuOpen
            ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          }
        </button>
      </div>

      <Sidebar
        activeView={activeView}
        setActiveView={handleViewChange}
        savantData={savantData}
        isOpen={isMenuOpen}
        syncState={syncState}
        profile={profile}
        onLogout={handleLogout}
      />

      <main className="content-area">
        <div className="max-container">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

export default App;
