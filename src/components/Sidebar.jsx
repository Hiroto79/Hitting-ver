import React from 'react';
import { UploadCloud, Users, User, LineChart, Trophy, HardDrive, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

function Sidebar({ activeView, setActiveView, savantData, isOpen, syncState }) {
  const menuItems = [
    { id: 'upload', label: 'データ読み込み', icon: UploadCloud },
    { id: 'cloud', label: 'クラウド管理', icon: HardDrive },
    { id: 'team', label: 'チーム分析', icon: Users, disabled: !savantData },
    { id: 'player', label: '個人成績', icon: User, disabled: !savantData },
    { id: 'game', label: '試合スタッツ', icon: Trophy, disabled: !savantData },
    { id: 'custom', label: 'カスタムグラフ', icon: LineChart, disabled: !savantData },
  ];

  return (
    <div className={`
      w-64 h-screen bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 text-gray-300
      fixed lg:relative z-40 transition-transform duration-300
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Baseball Analyzer
        </h1>
        <p className="text-xs text-gray-500 mt-1">Savant & Blast Integration</p>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveView(item.id)}
              disabled={item.disabled}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner' 
                  : item.disabled 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'hover:bg-gray-800 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        {syncState.saving && (
          <div className="flex items-center justify-center gap-2 text-blue-400 animate-pulse text-[10px] font-bold uppercase">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Saving to Cloud...
          </div>
        )}
        {syncState.lastSuccess && (
          <div className="flex items-center justify-center gap-2 text-emerald-500 text-[10px] font-bold uppercase">
            <CheckCircle2 className="w-3 h-3" />
            {syncState.lastSuccess}
          </div>
        )}
        {syncState.lastError && (
          <div className="flex items-center justify-center gap-2 text-red-500 text-[10px] font-bold uppercase">
            <AlertCircle className="w-3 h-3" />
            Sync Failed
          </div>
        )}
        <div className="text-[10px] text-gray-600 text-center">
          © 2026 Baseball Analytics
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
