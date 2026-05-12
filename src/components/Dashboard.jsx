import React, { useState, useEffect } from 'react';
import { extractTeams, extractPlayersByTeam, getPlayerStats } from '../utils/dataHelpers';
import PlayerProfile from './PlayerProfile';
import { Users, User } from 'lucide-react';

function Dashboard({ savantData, blastData }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  
  const [playerStats, setPlayerStats] = useState(null);

  // 1. Extract Teams when Savant data is loaded
  useEffect(() => {
    if (savantData && savantData.data) {
      const extractedTeams = extractTeams(savantData.data);
      setTeams(extractedTeams);
    }
  }, [savantData]);

  // 2. Extract Players when Team is selected
  useEffect(() => {
    if (selectedTeam && savantData && savantData.data) {
      const teamPlayers = extractPlayersByTeam(savantData.data, selectedTeam);
      setPlayers(teamPlayers);
      setSelectedPlayer(''); // Reset player
      setPlayerStats(null);
    }
  }, [selectedTeam, savantData]);

  // 3. Load Player Stats when Player is selected
  useEffect(() => {
    if (selectedPlayer && savantData && savantData.data) {
      const stats = getPlayerStats(savantData.data, blastData ? blastData.data : [], selectedPlayer);
      setPlayerStats(stats);
    }
  }, [selectedPlayer, savantData, blastData]);

  return (
    <div className="w-full">
      <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <span className="bg-blue-500 w-2 h-6 rounded-full mr-3"></span>
          データフィルター
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              チームを選択 (Rapsodoから抽出)
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">-- チームを選択してください --</option>
              {teams.map((team, idx) => (
                <option key={idx} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Player Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
              <User className="w-4 h-4 mr-1" />
              選手を選択
            </label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              disabled={!selectedTeam || players.length === 0}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- 選手を選択してください --</option>
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
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-gray-700 rounded-2xl">
          <User className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">上のメニューからチームと選手を選択すると、個人成績が表示されます。</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
