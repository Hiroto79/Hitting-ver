import React, { useMemo } from 'react';
import { calculateAverages, calculateMax, parseNumeric, isBarrel } from '../utils/dataHelpers';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Legend, Cell 
} from 'recharts';
import { TrendingUp, Activity, Zap, Target, BarChart3, Gauge, PieChart, ShieldCheck, Printer } from 'lucide-react';

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
    const avgBatSpeed = calculateAverages(filteredSavant, 'bat_speed') || calculateAverages(blastEvents, 'バットスピード');
    const maxBatSpeed = calculateMax(filteredSavant, 'bat_speed') || calculateMax(blastEvents, 'バットスピード');
    const avgAttackAngle = calculateAverages(filteredSavant, 'attack_angle');
    const avgExitVelo = calculateAverages(filteredSavant, 'launch_speed');
    const maxExitVelo = calculateMax(filteredSavant, 'launch_speed');
    const avgLaunchAngle = calculateAverages(filteredSavant, 'launch_angle');
    
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
      avgBatSpeed, maxBatSpeed, avgAttackAngle, avgExitVelo, maxExitVelo, avgLaunchAngle,
      avgPlaneScore, avgConnection, avgRotation, avgSwingTime,
      barrelRate, hardHitRate, sweetSpotRate
    };
  }, [filteredSavant, blastEvents]);

  // Memoize Radar Data
  const radarData = useMemo(() => [
    { subject: 'Speed', A: Math.min(100, (statsSummary.avgBatSpeed / 80) * 100), fullMark: 100, value: statsSummary.avgBatSpeed.toFixed(1) + ' mph' },
    { subject: 'Power', A: Math.min(100, (statsSummary.avgExitVelo / 100) * 100), fullMark: 100, value: statsSummary.avgExitVelo.toFixed(1) + ' mph' },
    { subject: 'Contact', A: statsSummary.avgPlaneScore, fullMark: 100, value: statsSummary.avgPlaneScore.toFixed(1) + ' %' },
    { subject: 'Rotation', A: statsSummary.avgRotation, fullMark: 100, value: statsSummary.avgRotation.toFixed(1) },
    { subject: 'Control', A: statsSummary.avgConnection, fullMark: 100, value: statsSummary.avgConnection.toFixed(1) },
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
    avgBatSpeed, maxBatSpeed, avgAttackAngle, avgExitVelo, maxExitVelo, avgLaunchAngle,
    avgPlaneScore, avgConnection, avgRotation, avgSwingTime,
    barrelRate, hardHitRate, sweetSpotRate 
  } = statsSummary;

  return (
    <div className="mt-4 md:mt-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">{playerName}</h2>
          <p className="text-gray-400 text-sm mt-1">打撃分析レポート</p>
        </div>
        <div className="flex gap-2 md:gap-4 items-center flex-wrap">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 rounded-xl transition-all text-xs md:text-sm"
          >
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">PDF保存</span>
          </button>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button 
              onClick={() => setHitsOnly(false)}
              className={`px-3 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-all ${!hitsOnly ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              ALL
            </button>
            <button 
              onClick={() => setHitsOnly(true)}
              className={`px-3 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-all ${hitsOnly ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              HITS
            </button>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-900/50 text-blue-300 rounded-full text-[10px] md:text-xs border border-blue-800 whitespace-nowrap">
              Savant: {filteredSavant.length}
            </span>
            <span className="px-2 py-0.5 md:px-3 md:py-1 bg-purple-900/50 text-purple-300 rounded-full text-[10px] md:text-xs border border-purple-800 whitespace-nowrap">
              Blast: {blastEvents.length}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <span className="text-xs md:text-sm font-bold text-slate-300">Launch Angle: <span className="text-blue-400 font-mono">{laRange[0]}° ~ {laRange[1]}°</span></span>
              <button onClick={() => setLaRange([-90, 90])} className="text-[10px] text-slate-500 hover:text-white">Reset</button>
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
          <div className="flex flex-wrap gap-1.5 justify-start lg:justify-end">
            {[[10, 40], [-10, 20], [25, 90], [-90, 5]].map(([min, max], idx) => (
              <button
                key={idx}
                onClick={() => setLaRange([min, max])}
                className={`px-2 md:px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${laRange[0] === min && laRange[1] === max ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
              >
                {idx === 0 ? 'Line Drive' : idx === 1 ? 'Ground' : idx === 2 ? 'Fly' : 'Down'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="p-3 md:p-4 rounded-xl border border-blue-700 bg-blue-900/10 border-l-4 border-l-blue-500 shadow-lg shadow-blue-900/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">バットスピード</h4>
            <Zap className="w-4 h-4 text-blue-500 opacity-70" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-2xl font-black text-white">{avgBatSpeed.toFixed(1)}</span>
              <span className="text-[8px] md:text-[10px] text-slate-500 font-bold">AVG</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm md:text-lg font-bold text-blue-400">{maxBatSpeed.toFixed(1)}</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase">MAX</span>
            </div>
          </div>
        </div>

        <StatCard 
          title="Hard Hit %" 
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
          title="Sweet Spot %" 
          value={`${sweetSpotRate}%`} 
          icon={Target} 
          colorClass="border-l-4 border-l-orange-500 shadow-lg shadow-orange-900/10" 
        />

        <div className="p-3 md:p-4 rounded-xl border border-emerald-700 bg-emerald-900/10 border-l-4 border-l-emerald-500 shadow-lg shadow-emerald-900/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">打球速度</h4>
            <BarChart3 className="w-4 h-4 text-emerald-500 opacity-70" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-2xl font-black text-white">{avgExitVelo.toFixed(1)}</span>
              <span className="text-[8px] md:text-[10px] text-slate-500 font-bold">AVG</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm md:text-lg font-bold text-emerald-400">{maxExitVelo.toFixed(1)}</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase">MAX</span>
            </div>
          </div>
        </div>

        <StatCard 
          title="平均打球角度" 
          value={`${avgLaunchAngle.toFixed(1)}°`} 
          icon={Activity} 
          colorClass="border-l-4 border-l-purple-500 shadow-lg shadow-purple-900/10 col-span-2 lg:col-span-1" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-1 bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl flex flex-col items-center">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center self-start">
            <ShieldCheck className="w-5 h-5 mr-2 text-blue-400" />
            総合評価
          </h3>
          <div className="w-full h-[280px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <PolarGrid stroke="#475569" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={playerName}
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
                  formatter={(value, name, props) => [props.payload.value, props.payload.subject]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:gap-4 w-full">
            <div className="bg-slate-900/50 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">MAX Speed</div>
              <div className="text-lg md:text-xl font-black text-white">{maxBatSpeed.toFixed(1)}</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Avg Attack</div>
              <div className="text-lg md:text-xl font-black text-white">{avgAttackAngle.toFixed(1)}°</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <span className="bg-purple-500 w-1.5 h-5 rounded-full mr-3 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></span>
            Blast Motion 分析
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'オンプレーン', val: avgPlaneScore, unit: '%' },
              { label: 'コネクション', val: avgConnection, unit: '' },
              { label: 'ローテーション', val: avgRotation, unit: '' },
              { label: 'スイング時間', val: avgSwingTime, unit: 's', decimals: 2 }
            ].map((m, i) => (
              <div key={i} className="bg-slate-900/80 p-4 md:p-6 rounded-2xl text-center border border-slate-700 hover:border-purple-500/50 transition-all group">
                <div className="text-slate-500 text-[10px] mb-2 uppercase tracking-tight whitespace-nowrap group-hover:text-purple-400 transition-colors">{m.label}</div>
                <div className="text-2xl md:text-3xl text-white group-hover:text-purple-400 font-black transition-colors">
                  {m.val.toFixed(m.decimals || 1)}
                  {m.unit && <span className="text-xs ml-0.5 opacity-40 font-normal">{m.unit}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 md:p-6 bg-slate-900/40 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs md:text-sm font-bold text-slate-300">スイング効率 (オンプレーン%)</span>
              <span className="text-[10px] px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded-lg border border-purple-500/20">High Performance</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.3)]" style={{ width: `${Math.min(100, Math.max(0, avgPlaneScore))}%` }}></div>
              </div>
              <span className="text-white font-bold font-mono text-sm">{avgPlaneScore.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        <div className="bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 h-[400px] md:h-[500px] shadow-2xl">
          <h3 className="text-sm md:text-base font-bold text-white mb-6 text-center">
            打球速度 vs アッパースイング度
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis type="number" dataKey="exitVelo" name="Exit Velocity" unit="mph" stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
              <YAxis type="number" dataKey="attackAngle" name="Attack Angle" unit="°" stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : value]}
              />
              <Scatter name="Swings" data={scatterData} fill="#10b981" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 h-[400px] md:h-[500px] shadow-2xl">
          <h3 className="text-sm md:text-base font-bold text-white mb-6 text-center">
            バットスピード vs 打球速度
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis type="number" dataKey="batSpeed" name="Bat Speed" unit="mph" stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
              <YAxis type="number" dataKey="exitVelo" name="Exit Velocity" unit="mph" stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : value]}
              />
              <Scatter name="Swings" data={scatterData} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 rounded-3xl p-4 md:p-8 border border-slate-700 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-6 text-center border-b border-slate-700 pb-4 flex items-center justify-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Blast 詳細データプレビュー
        </h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs md:text-sm text-left text-gray-300 min-w-[500px]">
            <thead className="text-[10px] md:text-xs text-gray-400 uppercase bg-slate-900/80 sticky top-0">
              <tr>
                <th className="px-4 py-3">オンプレーン効率</th>
                <th className="px-4 py-3">構え角度</th>
                <th className="px-4 py-3">インパクト角度</th>
                <th className="px-4 py-3">パワー(kW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {blastEvents.slice(0, 30).map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-purple-300">{formatVal(getBlastVal(row, 'オンプレーン'), 1, '%')}</td>
                  <td className="px-4 py-3">{formatVal(getBlastVal(row, '構え'), 1, '°')}</td>
                  <td className="px-4 py-3">{formatVal(getBlastVal(row, 'インパクト'), 1, '°')}</td>
                  <td className="px-4 py-3 font-bold text-white">{formatVal(getBlastVal(row, 'パワー'), 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfile;
