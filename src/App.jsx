import React, { useState } from 'react';
import Papa from 'papaparse';
import Sidebar from './components/Sidebar';
import UploadPage from './pages/UploadPage';
import TeamAnalysis from './pages/TeamAnalysis';
import PlayerAnalysis from './pages/PlayerAnalysis';
import CustomCharts from './pages/CustomCharts';
import GameStats from './pages/GameStats';
import CloudDataManager from './pages/CloudDataManager';
import './App.css';

import { getSupabase } from './lib/supabase';

function App() {
  const [savantData, setSavantData] = useState(null);
  const [blastData, setBlastData] = useState(null);
  const [combinedData, setCombinedData] = useState(null);
  const [activeView, setActiveView] = useState('upload');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Global saving state
  const [syncState, setSyncState] = useState({ saving: false, lastError: null, lastSuccess: null });

  const saveToCloud = async (type, dataObj) => {
    const key = localStorage.getItem('supabase_anon_key');
    if (!dataObj || !key) return;

    setSyncState(prev => ({ ...prev, saving: true, lastError: null }));
    const client = getSupabase(key);

    try {
      // Data Compression: Convert to CSV string to reduce payload size by ~80%
      const csvString = [
        dataObj.headers.join(','),
        ...dataObj.data.map(row => 
          dataObj.headers.map(h => {
            const val = row[h];
            return (typeof val === 'string' && val.includes(',')) ? `"${val}"` : val;
          }).join(',')
        )
      ].join('\n');

      const { error } = await client.from('baseball_data').upsert({
        type,
        filename: dataObj.filename,
        headers: dataObj.headers,
        data: csvString, 
        is_csv: true,
        updated_at: new Date()
      }, { onConflict: 'type, filename' }); // Allow multiple files per type if filenames differ

      if (error) throw error;
      setSyncState(prev => ({ ...prev, saving: false, lastSuccess: `${dataObj.filename} saved!` }));
      setTimeout(() => setSyncState(prev => ({ ...prev, lastSuccess: null })), 3000);
    } catch (err) {
      console.error(err);
      setSyncState(prev => ({ ...prev, saving: false, lastError: err.message }));
    }
  };

  // Helper to handle data updates with auto-parsing
  const updateDataState = (type, payload) => {
    if (!payload) {
      if (type === 'savant') setSavantData(null);
      if (type === 'blast') setBlastData(null);
      if (type === 'combined') setCombinedData(null);
      return;
    }

    let finalData = payload.data;
    if (typeof payload.data === 'string' && (payload.data.includes(',') || payload.is_csv)) {
      try {
        const results = Papa.parse(payload.data, { header: true, dynamicTyping: true, skipEmptyLines: true });
        finalData = results.data;
      } catch (e) {
        console.error("Parse error:", e);
      }
    }

    const processedPayload = { ...payload, data: finalData };
    if (type === 'savant') setSavantData(processedPayload);
    if (type === 'blast') setBlastData(processedPayload);
    if (type === 'combined') setCombinedData(processedPayload);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'upload':
        return (
          <UploadPage 
            savantData={savantData} 
            setSavantData={(p) => updateDataState('savant', p)} 
            blastData={blastData} 
            setBlastData={(p) => updateDataState('blast', p)}
            combinedData={combinedData}
            setCombinedData={(p) => updateDataState('combined', p)}
            setActiveView={setActiveView}
            saveToCloud={saveToCloud}
            syncState={syncState}
          />
        );
      case 'team':
        return <TeamAnalysis savantData={savantData} blastData={blastData} combinedData={combinedData} />;
      case 'player':
        return <PlayerAnalysis savantData={savantData} blastData={blastData} combinedData={combinedData} />;
      case 'game':
        return <GameStats savantData={savantData} blastData={blastData} combinedData={combinedData} />;
      case 'custom':
        return <CustomCharts savantData={savantData} blastData={blastData} combinedData={combinedData} />;
      case 'cloud':
        return <CloudDataManager updateDataState={updateDataState} />;
      default:
        return (
          <UploadPage 
            savantData={savantData} 
            setSavantData={(p) => updateDataState('savant', p)} 
            blastData={blastData} 
            setBlastData={(p) => updateDataState('blast', p)}
            combinedData={combinedData}
            setCombinedData={(p) => updateDataState('combined', p)}
            setActiveView={setActiveView}
            saveToCloud={saveToCloud}
            syncState={syncState}
          />
        );
    }
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setIsMenuOpen(false); // Close menu on navigation
  };

  return (
    <div className="main-layout">
      {/* Mobile sidebar overlay - tap to close */}
      {isMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center px-6 justify-between">
        <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Baseball Analyzer
        </h1>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          )}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={handleViewChange} 
        savantData={savantData}
        isOpen={isMenuOpen}
        syncState={syncState}
      />

      {/* Main Content Area */}
      <main className="content-area">
        <div className="max-container">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

export default App;
