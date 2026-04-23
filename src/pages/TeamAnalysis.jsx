import React, { useState, useEffect } from 'react';
import { extractTeams, extractPlayersByTeam, getPlayerStats, calculateAverages, groupEventsByTeamAndPlayer, parseNumeric } from '../utils/dataHelpers';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

function TeamAnalysis({ savantData, blastData, combinedData }) {
  const [sourceType, setSourceType] = useState('savant');
  const activeData = sourceType === 'savant' ? savantData : sourceType === 'blast' ? blastData : combinedData;
  
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamStats, setTeamStats] = useState(null);
  const [nameKey, setNameKey] = useState('player_name');
  const [hitsOnly, setHitsOnly] = useState(false);
  const [laRange, setLaRange] = useState([-90, 90]);
  const [groupedData, setGroupedData] = useState({});
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

        return {
          player,
          avgBatSpeed: Number(calculateAverages(filteredEvents, 'bat_speed')),
          avgAttackAngle: Number(calculateAverages(filteredEvents, 'attack_angle')),
          avgExitVelo: Number(calculateAverages(filteredEvents, 'launch_speed')),
          swings: filteredEvents.length
        };
      }).filter(s => s.swings > 0);

      // Sort by Bat Speed descending
      statsList.sort((a, b) => b.avgBatSpeed - a.avgBatSpeed);

      const teamAvgBatSpeed = statsList.length > 0 ? (statsList.reduce((acc, s) => acc + s.avgBatSpeed, 0) / statsList.length).toFixed(1) : 0;
      const teamAvgAttackAngle = statsList.length > 0 ? (statsList.reduce((acc, s) => acc + s.avgAttackAngle, 0) / statsList.length).toFixed(1) : 0;

      setTeamStats({
        players: statsList,
        teamAvgBatSpeed,
        teamAvgAttackAngle
      });
    } else {
      setTeamStats(null);
    }
  }, [selectedTeam, groupedData, hitsOnly, laRange]);

  // Generate colors for scatter plot points
  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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
              {headers.map((h, idx) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <div className="text-blue-300 text-sm font-medium mb-1">チーム平均バットスピード</div>
              <div className="text-4xl font-extrabold text-white">{teamStats.teamAvgBatSpeed} <span className="text-lg text-blue-400 font-normal">mph</span></div>
            </div>
            <div className="bg-green-900/30 border border-green-800/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <div className="text-green-300 text-sm font-medium mb-1">チーム平均アッパースイング度</div>
              <div className="text-4xl font-extrabold text-white">{teamStats.teamAvgAttackAngle} <span className="text-lg text-green-400 font-normal">°</span></div>
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
                      <th className="px-4 py-3 text-green-400">平均アッパー度</th>
                      <th className="px-4 py-3">平均打球速度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.players.map((p, i) => (
                      <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{p.player}</td>
                        <td className="px-4 py-3">{p.swings}</td>
                        <td className="px-4 py-3 font-bold">{p.avgBatSpeed.toFixed(1)}</td>
                        <td className="px-4 py-3 font-bold">{p.avgAttackAngle.toFixed(1)}°</td>
                        <td className="px-4 py-3">{p.avgExitVelo.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-8 shadow-2xl flex flex-col" style={{height: 'clamp(320px, 50vw, 600px)'}}>
              <h3 className="font-bold text-white mb-4 text-center">バットスピード vs アッパースイング度 (チーム内分布)</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" dataKey="avgBatSpeed" name="Bat Speed" unit="mph" stroke="#94a3b8" domain={['auto', 'auto']} />
                    <YAxis type="number" dataKey="avgAttackAngle" name="Attack Angle" unit="°" stroke="#94a3b8" domain={['auto', 'auto']} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-sm">
                              <p className="font-bold text-white mb-1 border-b border-slate-700 pb-1">{data.player}</p>
                              <p className="text-blue-400">平均バットスピード: <span className="text-white font-mono">{data.avgBatSpeed.toFixed(1)} mph</span></p>
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
