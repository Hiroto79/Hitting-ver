import React, { useState, useEffect } from 'react';
import { extractTeams, extractPlayersByTeam, getPlayerStats, groupEventsByTeamAndPlayer } from '../utils/dataHelpers';
import PlayerProfile from '../components/PlayerProfile';
import { Users, User, Settings2 } from 'lucide-react';

function PlayerAnalysis({ savantData, blastData, initialPlayer, initialTeam }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam || '');
  
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer || '');
  
  const [playerStats, setPlayerStats] = useState(null);
  const [nameKey, setNameKey] = useState('player_name');
  const [groupedData, setGroupedData] = useState({});
  const headers = savantData ? savantData.headers : [];

  useEffect(() => {
    if (savantData && savantData.data) {
      const grouped = groupEventsByTeamAndPlayer(savantData.data, nameKey);
      setGroupedData(grouped);
      setTeams(Object.keys(grouped).sort());
      
      // If we have an initial team, ensure players list is updated
      if (initialTeam && grouped[initialTeam]) {
        const teamPlayers = Object.keys(grouped[initialTeam]).sort();
        setPlayers(teamPlayers);
        // Also ensure selectedPlayer is set if initialPlayer exists
        if (initialPlayer && grouped[initialTeam][initialPlayer]) {
          setSelectedPlayer(initialPlayer);
        }
      }
    }
  }, [savantData, nameKey, initialTeam]);

  useEffect(() => {
    if (selectedTeam && groupedData[selectedTeam]) {
      const teamPlayers = Object.keys(groupedData[selectedTeam]).sort();
      setPlayers(teamPlayers);
      
      // 修正: すでに選択されている選手が新しいチームリストに含まれている場合は、リセットしない
      if (selectedPlayer && teamPlayers.includes(selectedPlayer)) {
        // 保持
      } else if (initialPlayer && teamPlayers.includes(initialPlayer)) {
        // 初期値があればそれを優先
        setSelectedPlayer(initialPlayer);
      } else {
        setSelectedPlayer('');
        setPlayerStats(null);
      }
    }
  }, [selectedTeam, groupedData, initialPlayer]);

  useEffect(() => {
    if (selectedPlayer && selectedTeam && groupedData[selectedTeam] && groupedData[selectedTeam][selectedPlayer]) {
      const events = groupedData[selectedTeam][selectedPlayer];
      setPlayerStats({
        savantEvents: events,
        blastEvents: blastData ? blastData.data : []
      });
    }
  }, [selectedPlayer, selectedTeam, groupedData, blastData]);

  return (
    <div className="animate-in fade-in duration-300">
      <header className="mb-10 print:hidden">
        <h2 className="text-4xl font-extrabold text-white mb-2">個人成績分析</h2>
        <p className="text-slate-400 text-lg">選手を特定して詳細な打撃レポートを表示します。</p>
      </header>

      <div className="bg-blue-900/10 border-2 border-blue-500/30 p-8 rounded-3xl mb-10 shadow-2xl backdrop-blur-sm print:hidden">
        <div className="flex items-center mb-6 text-blue-300">
          <Settings2 className="w-6 h-6 mr-2" />
          <h3 className="text-xl font-bold">分析設定</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <label className="block text-sm font-bold text-blue-400 mb-2 uppercase tracking-widest">
              1. 名前として使用する列
            </label>
            <p className="text-xs text-slate-500 mb-3">※投手名の列になっている場合は、野手ID（batter等）を選んでください</p>
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
              3. 対象選手
            </label>
            <p className="text-xs text-slate-500 mb-3 invisible">spacer</p>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              disabled={!selectedTeam || players.length === 0}
              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 text-white rounded-xl p-4 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg disabled:opacity-30 disabled:cursor-not-allowed font-bold"
            >
              <option value="">-- 選手を選択 --</option>
              {players.map((player, idx) => (
                <option key={idx} value={player}>{player}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {playerStats ? (
        <PlayerProfile playerName={selectedPlayer} stats={playerStats} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
          <User className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">上のメニューからチームと選手を選択してください</p>
        </div>
      )}
    </div>
  );
}

export default PlayerAnalysis;
