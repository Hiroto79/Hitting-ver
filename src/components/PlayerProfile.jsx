import React, { useMemo } from 'react';
import { calculateAverages, calculateMax, parseNumeric, isBarrel } from '../utils/dataHelpers';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Legend, Cell 
} from 'recharts';
import { TrendingUp, Activity, Zap, Target, BarChart3, Gauge, PieChart, ShieldCheck } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className={`p-4 rounded-xl border border-gray-700 bg-gray-800 ${colorClass}`}>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-gray-400 text-sm font-medium">{title}</h4>
      <Icon className="w-5 h-5 opacity-70" />
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

const getBlastVal = (row, pattern) => {
  const key = Object.keys(row).find(k => k.includes(pattern));
  return key ? parseNumeric(row[key]) : NaN;
};

const formatVal = (val, decimals = 1, unit = '') => {
  return (val === null || val === undefined || isNaN(val)) ? '-' : `${val.toFixed(decimals)}${unit}`;
};

function PlayerProfile({ playerName, stats }) {
  const [hitsOnly, setHitsOnly] = React.useState(false);
  const [laRange, setLaRange] = React.useState([-90, 90]);

  const { savantEvents, blastEvents } = stats;
  
  // Memoize filters to avoid recalculating on every scroll/interaction
  const filteredSavant = useMemo(() => {
    return savantEvents.filter(e => {
      const isHitEvent = ['single', 'double', 'triple', 'home_run'].includes(e.events?.toLowerCase());
      const la = parseNumeric(e.launch_angle);
      const passHits = hitsOnly ? isHitEvent : true;
      const passLa = la >= laRange[0] && la <= laRange[1];
      return passHits && passLa;
    });
  }, [savantEvents, hitsOnly, laRange]);

  // Memoize aggregations
  const statsSummary = useMemo(() => {
    const avgBatSpeed = calculateAverages(filteredSavant, 'bat_speed');
    const maxBatSpeed = calculateMax(filteredSavant, 'bat_speed');
    const avgAttackAngle = calculateAverages(filteredSavant, 'attack_angle');
    const avgExitVelo = calculateAverages(filteredSavant, 'launch_speed');
    
    const avgPlaneScore = calculateAverages(blastEvents, 'オンプレーンスコア');
    const avgConnection = calculateAverages(blastEvents, '体とバットの角度スコア');
    const avgRotation = calculateAverages(blastEvents, '体の回転による加速スコア');
    const avgSwingTime = calculateAverages(blastEvents, 'スイング時間 (sec)');

    const barrelEvents = filteredSavant.filter(e => isBarrel(parseNumeric(e.launch_speed), parseNumeric(e.launch_angle)));
    const barrelRate = filteredSavant.length > 0 ? (barrelEvents.length / filteredSavant.length * 100).toFixed(1) : 0;

    const hardHitEvents = filteredSavant.filter(e => parseNumeric(e.launch_speed) >= 95);
    const hardHitRate = filteredSavant.length > 0 ? (hardHitEvents.length / filteredSavant.length * 100).toFixed(1) : 0;
    
    const sweetSpotEvents = filteredSavant.filter(e => {
      const la = parseNumeric(e.launch_angle);
      return la >= 8 && la <= 32;
    });
    const sweetSpotRate = filteredSavant.length > 0 ? (sweetSpotEvents.length / filteredSavant.length * 100).toFixed(1) : 0;

    return {
      avgBatSpeed, maxBatSpeed, avgAttackAngle, avgExitVelo,
      avgPlaneScore, avgConnection, avgRotation, avgSwingTime,
      barrelRate, hardHitRate, sweetSpotRate
    };
  }, [filteredSavant, blastEvents]);

  // Memoize Radar Data
  const radarData = useMemo(() => [
    { subject: 'Speed', A: Math.min(100, (statsSummary.avgBatSpeed / 80) * 100), fullMark: 100 },
    { subject: 'Power', A: Math.min(100, (statsSummary.avgExitVelo / 100) * 100), fullMark: 100 },
    { subject: 'Contact', A: statsSummary.avgPlaneScore, fullMark: 100 },
    { subject: 'Rotation', A: statsSummary.avgRotation, fullMark: 100 },
    { subject: 'Control', A: statsSummary.avgConnection, fullMark: 100 },
  ], [statsSummary]);

  // Memoize Scatter data
  const scatterData = useMemo(() => {
    return filteredSavant
      .filter(e => !isNaN(parseNumeric(e.bat_speed)) && !isNaN(parseNumeric(e.attack_angle)))
      .map(e => ({
        batSpeed: parseNumeric(e.bat_speed),
        attackAngle: parseNumeric(e.attack_angle),
        exitVelo: parseNumeric(e.launch_speed) || 0,
        events: e.events
      }));
  }, [filteredSavant]);

  const { 
    avgBatSpeed, maxBatSpeed, avgAttackAngle, avgExitVelo,
    avgPlaneScore, avgConnection, avgRotation, avgSwingTime,
    barrelRate, hardHitRate, sweetSpotRate 
  } = statsSummary;

  return (
    <div className="mt-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white">{playerName}</h2>
          <p className="text-gray-400 mt-1">打撃分析レポート</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
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
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm border border-blue-800">
              Savant: {filteredSavant.length}球
            </span>
            <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm border border-purple-800">
              Blast: {blastEvents.length}スイング
            </span>
          </div>
        </div>
      </div>

      {/* LA Range Quick Filter & Slider */}
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-300">Launch Angle 調整: <span className="text-blue-400 font-mono">{laRange[0]}° ~ {laRange[1]}°</span></span>
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
          <div className="flex flex-wrap gap-2 md:w-1/2 justify-end">
            {[[10, 40], [-10, 20], [25, 90], [-90, 5]].map(([min, max], idx) => (
              <button
                key={idx}
                onClick={() => setLaRange([min, max])}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${laRange[0] === min && laRange[1] === max ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
              >
                {idx === 0 ? 'Line Drive' : idx === 1 ? 'Ground Ball' : idx === 2 ? 'Fly Ball' : 'Down-Hit'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="平均バットスピード" 
          value={`${avgBatSpeed.toFixed(1)} mph`} 
          icon={Zap} 
          colorClass="border-l-4 border-l-blue-500 shadow-lg shadow-blue-900/10" 
        />
        <StatCard 
          title="Hard Hit % (95+ mph)" 
          value={`${hardHitRate}%`} 
          icon={Gauge} 
          colorClass="border-l-4 border-l-red-500 shadow-lg shadow-red-900/10" 
        />
        <StatCard 
          title="Barrel %" 
          value={`${barrelRate}%`} 
          icon={TrendingUp} 
          colorClass="border-l-4 border-l-yellow-500 shadow-lg shadow-yellow-900/10" 
        />
        <StatCard 
          title="Sweet Spot % (8-32°)" 
          value={`${sweetSpotRate}%`} 
          icon={Target} 
          colorClass="border-l-4 border-l-orange-500 shadow-lg shadow-orange-900/10" 
        />
        <StatCard 
          title="平均打球速度" 
          value={`${avgExitVelo.toFixed(1)} mph`} 
          icon={BarChart3} 
          colorClass="border-l-4 border-l-emerald-500 shadow-lg shadow-emerald-900/10" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Summary / Radar */}
        <div className="lg:col-span-1 bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl flex flex-col items-center">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center self-start">
            <ShieldCheck className="w-6 h-6 mr-2 text-blue-400" />
            総合評価
          </h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#475569" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={playerName}
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 w-full">
            <div className="bg-slate-900/50 p-3 rounded-xl text-center">
              <div className="text-xs text-slate-500 uppercase">MAX Speed</div>
              <div className="text-xl font-bold text-white">{maxBatSpeed.toFixed(1)}</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl text-center">
              <div className="text-xs text-slate-500 uppercase">Avg Attack</div>
              <div className="text-xl font-bold text-white">{avgAttackAngle.toFixed(1)}°</div>
            </div>
          </div>
        </div>

        {/* Blast Metrics */}
        <div className="lg:col-span-2 bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="bg-purple-500 w-2 h-6 rounded-full mr-3 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></span>
            Blast Motion 分析
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="bg-slate-900/80 p-6 rounded-2xl text-center border border-slate-700 hover:border-purple-500/50 transition-colors">
              <div className="text-slate-500 text-xs mb-2 uppercase tracking-tighter">オンプレーン</div>
              <div className="text-3xl text-purple-400 font-black">{avgPlaneScore.toFixed(1)}</div>
            </div>
            <div className="bg-slate-900/80 p-6 rounded-2xl text-center border border-slate-700 hover:border-purple-500/50 transition-colors">
              <div className="text-slate-500 text-xs mb-2 uppercase tracking-tighter">コネクション</div>
              <div className="text-3xl text-purple-400 font-black">{avgConnection.toFixed(1)}</div>
            </div>
            <div className="bg-slate-900/80 p-6 rounded-2xl text-center border border-slate-700 hover:border-purple-500/50 transition-colors">
              <div className="text-slate-500 text-xs mb-2 uppercase tracking-tighter">ローテーション</div>
              <div className="text-3xl text-purple-400 font-black">{avgRotation.toFixed(1)}</div>
            </div>
            <div className="bg-slate-900/80 p-6 rounded-2xl text-center border border-slate-700 hover:border-purple-500/50 transition-colors shadow-inner">
              <div className="text-slate-500 text-xs mb-2 uppercase tracking-tighter">スイング時間</div>
              <div className="text-3xl text-purple-400 font-black">{avgSwingTime.toFixed(2)}<span className="text-sm ml-1 font-normal opacity-50">s</span></div>
            </div>
          </div>
          <div className="mt-8 p-6 bg-slate-900/40 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-300">スイング効率サマリー</span>
              <span className="text-xs px-2 py-1 bg-purple-900/30 text-purple-400 rounded-lg">High Performance</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${avgPlaneScore}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Visuals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 h-[500px] shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6 text-center">
            打球速度 vs アッパースイング度
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" dataKey="exitVelo" name="Exit Velocity" unit="mph" stroke="#94a3b8" domain={['auto', 'auto']} />
              <YAxis type="number" dataKey="attackAngle" name="Attack Angle" unit="°" stroke="#94a3b8" domain={['auto', 'auto']} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem' }} />
              <Scatter name="Swings" data={scatterData} fill="#10b981" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 h-[500px] shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6 text-center border-b border-slate-700 pb-4">
            Blast 詳細データプレビュー
          </h3>
          <div className="overflow-y-auto h-[350px] pr-2 custom-scrollbar">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-slate-900/80 sticky top-0">
                <tr>
                  <th className="px-4 py-3">オンプレーン効率</th>
                  <th className="px-4 py-3">構え角度</th>
                  <th className="px-4 py-3">インパクト角度</th>
                  <th className="px-4 py-3">パワー(kW)</th>
                </tr>
              </thead>
              <tbody>
                {blastEvents.slice(0, 30).map((row, i) => (
                  <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-purple-300">{formatVal(getBlastVal(row, 'オンプレーン'), 1, '%')}</td>
                    <td className="px-4 py-3">{formatVal(getBlastVal(row, '構え'), 1, '°')}</td>
                    <td className="px-4 py-3">{formatVal(getBlastVal(row, 'インパクト'), 1, '°')}</td>
                    <td className="px-4 py-3 font-bold">{formatVal(getBlastVal(row, 'パワー'), 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfile;
