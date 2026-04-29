import React, { useState, useEffect } from 'react';
import { extractTeams, extractPlayersByTeam, getPlayerStats, calculateAverages, calculateMax, groupEventsByTeamAndPlayer, parseNumeric } from '../utils/dataHelpers';
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList } from 'recharts';
import { Users, TrendingUp, Zap, BarChart3, Eye } from 'lucide-react';

function TeamAnalysis({ savantData, blastData, combinedData, onViewPlayer }) {
  const [sourceType, setSourceType] = useState('savant');
  const activeData = sourceType === 'savant' ? savantData : sourceType === 'blast' ? blastData : combinedData;
  
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamStats, setTeamStats] = useState(null);
  const [nameKey, setNameKey] = useState('player_name');
  const [hitsOnly, setHitsOnly] = useState(false);
  const [laRange, setLaRange] = useState([-90, 90]);
  const [groupedData, setGroupedData] = useState({});
  const [activePlayers, setActivePlayers] = useState([]); // Filter state
  const headers = activeData ? activeData.headers : [];

  useEffect(() => {
    if (activeData && activeData.data) {
      const grouped = groupEventsByTeamAndPlayer(activeData.data, nameKey);
      setGroupedData(grouped);
      setTeams(Object.keys(grouped).sort());
    }
  }, [activeData, nameKey]);

  useEffect(() => {
    if (selectedTeam && groupedData[selectedTeam]) {
      const teamPlayers = groupedData[selectedTeam];
      
      // Initialize active players when team changes
      if (activePlayers.length === 0 || !activePlayers.some(p => Object.keys(teamPlayers).includes(p))) {
        setActivePlayers(Object.keys(teamPlayers));
      }
      
      const statsList = Object.keys(teamPlayers).map(player => {
        const events = teamPlayers[player];
        if (!events || !Array.isArray(events)) return null;

        const filteredEvents = events.filter(e => {
          if (!e) return false;
          const isHitEvent = e.events && typeof e.events === 'string' && ['single', 'double', 'triple', 'home_run'].includes(e.events.toLowerCase());
          const la = parseNumeric(e.launch_angle);
          const passHits = hitsOnly ? isHitEvent : true;
          const passLa = !isNaN(la) ? (la >= laRange[0] && la <= laRange[1]) : true;
          return passHits && passLa;
        });

        const MPH_TO_KMH = 1.60934;
        
        const rawAvgBatSpeed = Number(calculateAverages(filteredEvents, 'bat_speed'));
        const avgBatSpeed = rawAvgBatSpeed > 0 && rawAvgBatSpeed < 100 ? rawAvgBatSpeed * MPH_TO_KMH : rawAvgBatSpeed;
        const rawMaxBatSpeed = Number(calculateMax(filteredEvents, 'bat_speed'));
        const maxBatSpeed = rawMaxBatSpeed > 0 && rawMaxBatSpeed < 100 ? rawMaxBatSpeed * MPH_TO_KMH : rawMaxBatSpeed;
        
        const rawAvgExitVelo = Number(calculateAverages(filteredEvents, 'launch_speed'));
        const avgExitVelo = rawAvgExitVelo > 0 && rawAvgExitVelo < 130 ? rawAvgExitVelo * MPH_TO_KMH : rawAvgExitVelo;
        const rawMaxExitVelo = Number(calculateMax(filteredEvents, 'launch_speed'));
        const maxExitVelo = rawMaxExitVelo > 0 && rawMaxExitVelo < 130 ? rawMaxExitVelo * MPH_TO_KMH : rawMaxExitVelo;

        return {
          player,
          avgBatSpeed,
          maxBatSpeed,
          avgAttackAngle: Number(calculateAverages(filteredEvents, 'attack_angle')),
          avgExitVelo,
          maxExitVelo,
          avgLaunchAngle: Number(calculateAverages(filteredEvents, 'launch_angle')),
          swings: filteredEvents.length
        };
      }).filter(s => s.swings > 0);

      // Sort by Bat Speed descending
      statsList.sort((a, b) => b.avgBatSpeed - a.avgBatSpeed);

      const activeStats = statsList.filter(s => activePlayers.includes(s.player));

      const teamAvgBatSpeed = activeStats.length > 0 ? (activeStats.reduce((acc, s) => acc + s.avgBatSpeed, 0) / activeStats.length).toFixed(1) : 0;
      const teamAvgAttackAngle = activeStats.length > 0 ? (activeStats.reduce((acc, s) => acc + s.avgAttackAngle, 0) / activeStats.length).toFixed(1) : 0;
      const teamAvgExitVelo = activeStats.length > 0 ? (activeStats.reduce((acc, s) => acc + s.avgExitVelo, 0) / activeStats.length).toFixed(1) : 0;
      const teamAvgLaunchAngle = activeStats.length > 0 ? (activeStats.reduce((acc, s) => acc + s.avgLaunchAngle, 0) / activeStats.length).toFixed(1) : 0;

      setTeamStats({
        allPlayers: statsList,
        players: activeStats,
        teamAvgBatSpeed,
        teamAvgAttackAngle,
        teamAvgExitVelo,
        teamAvgLaunchAngle
      });
    } else {
      setTeamStats(null);
      setActivePlayers([]);
    }
  }, [selectedTeam, groupedData, hitsOnly, laRange, activePlayers]);

  // Generate colors for scatter plot points
  const COLORS = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#06b6d4', '#d946ef', '#f43f5e', '#eab308', '#22c55e',
    '#a855f7', '#0ea5e9', '#f87171', '#34d399', '#fbbf24'
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold text-white mb-2">チーム分析</h2>
        <p className="text-slate-400">チーム全体の傾向や、選手同士の比較を行います。</p>
      </header>

      <div className="bg-blue-900/10 border-2 border-blue-500/30 p-8 rounded-3xl mb-10 shadow-2xl backdrop-blur-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          <div>
            <label className="block text-sm font-bold text-emerald-400 mb-2 uppercase tracking-widest">
              0. 分析に使用するデータ
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full bg-slate-900 border-2 border-emerald-500/20 text-white rounded-xl p-4 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all font-bold"
            >
              <option value="savant">Savant Data</option>
              <option value="blast">Blast Data</option>
              <option value="combined">Combined Data</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-blue-400 mb-2 uppercase tracking-widest">
              1. 名前として使用する列
            </label>
            <p className="text-xs text-slate-500 mb-3">※野手分析時はID（batter等）を選択してください</p>
            <select
              value={nameKey}
              onChange={(e) => setNameKey(e.target.value)}
              className="w-full bg-slate-900 border-2 border-blue-500/20 hover:border-blue-500/50 text-white rounded-xl p-4 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-bold text-lg"
            >
              {/* 重要な列を優先的に上に表示し、それ以外もすべて表示する */}
              {Array.from(new Set([
                'player_name', 'pitcher_name', 'batter_name', 'batter', 'pitcher',
                ...headers
              ]))
                .filter(h => headers.includes(h))
                .map((h, idx) => (
                  <option key={idx} value={h}>{h}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
              2. 対象チーム
            </label>
            <p className="text-xs text-slate-500 mb-3 invisible">spacer</p>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 text-white rounded-xl p-4 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg"
            >
              <option value="">-- チームを選択 --</option>
              {teams.map((team, idx) => (
                <option key={idx} value={team}>{team}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
              3. 表示設定
            </label>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 h-[60px] items-center px-4">
              <button 
                onClick={() => setHitsOnly(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!hitsOnly ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                全スイング
              </button>
              <button 
                onClick={() => setHitsOnly(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${hitsOnly ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                安打のみ
              </button>
            </div>
          </div>
        </div>

        {/* LA Range Filter (Added) */}
        <div className="mt-8 pt-8 border-t border-blue-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-300">チーム分析 Launch Angle 調整: <span className="text-blue-400 font-mono">{laRange[0]}° ~ {laRange[1]}°</span></span>
                <button onClick={() => setLaRange([-90, 90])} className="text-xs text-slate-500 hover:text-white">リセット</button>
              </div>
              <div className="relative h-2 bg-slate-700 rounded-full">
                <input 
                  type="range" min="-90" max="90" value={laRange[0]} 
                  onChange={(e) => setLaRange([Math.min(Number(e.target.value), laRange[1]), laRange[1]])}
                  className="absolute w-full h-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full" 
                />
                <input 
                  type="range" min="-90" max="90" value={laRange[1]} 
                  onChange={(e) => setLaRange([laRange[0], Math.max(Number(e.target.value), laRange[0])])}
                  className="absolute w-full h-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:rounded-full" 
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 h-fit">
                <button 
                  onClick={() => setHitsOnly(false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!hitsOnly ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  ALL
                </button>
                <button 
                  onClick={() => setHitsOnly(true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${hitsOnly ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  HITS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {teamStats ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              比較する選手を選択
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActivePlayers(teamStats.allPlayers.map(p => p.player))}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded-lg transition-colors text-white"
              >
                全選択
              </button>
              <button
                onClick={() => setActivePlayers([])}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded-lg transition-colors text-white"
              >
                クリア
              </button>
              <div className="w-px h-6 bg-slate-600 mx-2"></div>
              {teamStats.allPlayers.map((p, i) => {
                const isActive = activePlayers.includes(p.player);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (isActive) setActivePlayers(activePlayers.filter(ap => ap !== p.player));
                      else setActivePlayers([...activePlayers, p.player]);
                    }}
                    className={`px-3 py-1 text-xs rounded-lg transition-all border ${
                      isActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p.player}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-blue-300 text-xs font-medium mb-1">平均バットスピード</div>
              <div className="text-2xl font-extrabold text-white">{teamStats.teamAvgBatSpeed} <span className="text-xs text-blue-400 font-normal">km/h</span></div>
            </div>
            <div className="bg-green-900/30 border border-green-800/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-green-300 text-xs font-medium mb-1">平均アッパースイング度</div>
              <div className="text-2xl font-extrabold text-white">{teamStats.teamAvgAttackAngle} <span className="text-xs text-green-400 font-normal">°</span></div>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-emerald-300 text-xs font-medium mb-1">平均打球速度</div>
              <div className="text-2xl font-extrabold text-white">{teamStats.teamAvgExitVelo} <span className="text-xs text-emerald-400 font-normal">km/h</span></div>
            </div>
            <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-purple-300 text-xs font-medium mb-1">平均打球角度</div>
              <div className="text-2xl font-extrabold text-white">{teamStats.teamAvgLaunchAngle} <span className="text-xs text-purple-400 font-normal">°</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center">
                <TrendingUp className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="font-bold text-white">選手比較テーブル</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3">選手名</th>
                      <th className="px-4 py-3">データ数</th>
                      <th className="px-4 py-3 text-blue-400">平均バットスピード</th>
                      <th className="px-4 py-3 text-blue-300">最大バットスピード</th>
                      <th className="px-4 py-3 text-green-400">平均アッパー度</th>
                      <th className="px-4 py-3 text-emerald-400">平均打球速度</th>
                      <th className="px-4 py-3 text-emerald-300">最大打球速度</th>
                      <th className="px-4 py-3 text-purple-400">平均打球角度</th>
                      <th className="px-4 py-3 text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.players.map((p, i) => (
                      <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{p.player}</td>
                        <td className="px-4 py-3">{p.swings}</td>
                        <td className="px-4 py-3 font-bold text-blue-300">{p.avgBatSpeed.toFixed(1)}</td>
                        <td className="px-4 py-3 font-bold text-blue-200">{p.maxBatSpeed.toFixed(1)}</td>
                        <td className="px-4 py-3 font-bold text-green-300">{p.avgAttackAngle.toFixed(1)}°</td>
                        <td className="px-4 py-3 font-bold text-emerald-300">{p.avgExitVelo.toFixed(1)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-200">{p.maxExitVelo.toFixed(1)}</td>
                        <td className="px-4 py-3 font-bold text-purple-300">{p.avgLaunchAngle.toFixed(1)}°</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => onViewPlayer(p.player, selectedTeam)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shadow-lg flex items-center ml-auto"
                          >
                            <BarChart3 className="w-3 h-3 mr-1" />レポート表示
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center">
                <Zap className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="font-bold text-white">最大バットスピード & 打球速度 比較</h3>
              </div>
              <div className="p-4" style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamStats.players} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="player" stroke="#94a3b8" fontSize={10} interval={0} angle={-45} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} unit="km/h" />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-sm">
                              <p className="font-bold text-white mb-2 border-b border-slate-700 pb-1">{label}</p>
                              {payload.map((entry, index) => (
                                <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
                                  <span>{entry.name}:</span>
                                  <span className="text-white font-mono">{Number(entry.value).toFixed(1)} km/h</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="maxBatSpeed" name="最大バットスピード" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maxExitVelo" name="最大打球速度" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-8 shadow-2xl flex flex-col" style={{height: '400px'}}>
              <h3 className="font-bold text-white mb-4 text-center">バットスピード vs アッパースイング度 (チーム内分布)</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" dataKey="avgBatSpeed" name="Bat Speed" unit="km/h" stroke="#94a3b8" domain={['auto', 'auto']} />
                    <YAxis type="number" dataKey="avgAttackAngle" name="Attack Angle" unit="°" stroke="#94a3b8" domain={['auto', 'auto']} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-sm">
                              <p className="font-bold text-white mb-1 border-b border-slate-700 pb-1">{data.player}</p>
                              <p className="text-blue-400">平均バットスピード: <span className="text-white font-mono">{data.avgBatSpeed.toFixed(1)} km/h</span></p>
                              <p className="text-green-400">平均アッパー度: <span className="text-white font-mono">{data.avgAttackAngle.toFixed(1)}°</span></p>
                              <p className="text-slate-400 text-xs mt-1">スイング数: {data.swings}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Players" data={teamStats.players}>
                      {teamStats.players.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList dataKey="player" position="top" fill="#94a3b8" fontSize={10} offset={10} />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
          <Users className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">チームを選択すると、チーム内の比較表やグラフが表示されます</p>
        </div>
      )}
    </div>
  );
}

export default TeamAnalysis;
