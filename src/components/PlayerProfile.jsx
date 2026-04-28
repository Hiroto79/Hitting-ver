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

// 変換定数
const MPH_TO_KMH = 1.60934;
const FEET_TO_METERS = 0.3048;

function PlayerProfile({ playerName, stats }) {
  const [hitsOnly, setHitsOnly] = React.useState(false);
  const [laRange, setLaRange] = React.useState([-90, 90]);

  const { savantEvents, blastEvents } = stats;
  
  const filteredSavant = useMemo(() => {
    return savantEvents.filter(e => {
      const isHitEvent = ['single', 'double', 'triple', 'home_run'].includes(e.events?.toLowerCase());
      const la = parseNumeric(e.launch_angle);
      const passHits = hitsOnly ? isHitEvent : true;
      const passLa = la >= laRange[0] && la <= laRange[1];
      return passHits && passLa;
    });
  }, [savantEvents, hitsOnly, laRange]);

  const statsSummary = useMemo(() => {
    // 1. バットスピードの取得 (Savantがあればmph、なければBlastのkm/h)
    const savantBatSpeed = calculateAverages(filteredSavant, 'bat_speed');
    const blastBatSpeed = calculateAverages(blastEvents, 'バットスピード');
    
    let avgBatSpeed = 0;
    let maxBatSpeed = 0;
    
    // 判定ロジック: Savantデータがあり、かつ数値が一般的なmphの範囲（例: 100未満）ならkm/hに変換
    if (savantBatSpeed > 0) {
      const needsConversion = savantBatSpeed < 100; 
      avgBatSpeed = needsConversion ? savantBatSpeed * MPH_TO_KMH : savantBatSpeed;
      maxBatSpeed = needsConversion ? calculateMax(filteredSavant, 'bat_speed') * MPH_TO_KMH : calculateMax(filteredSavant, 'bat_speed');
    } else {
      avgBatSpeed = blastBatSpeed;
      maxBatSpeed = calculateMax(blastEvents, 'バットスピード');
    }

    // 2. 打球速度 (mph -> km/h)
    const rawExitVelo = calculateAverages(filteredSavant, 'launch_speed');
    const avgExitVelo = rawExitVelo > 0 && rawExitVelo < 130 ? rawExitVelo * MPH_TO_KMH : rawExitVelo;
    const rawMaxExitVelo = calculateMax(filteredSavant, 'launch_speed');
    const maxExitVelo = rawMaxExitVelo > 0 && rawMaxExitVelo < 130 ? rawMaxExitVelo * MPH_TO_KMH : rawMaxExitVelo;

    const avgAttackAngle = calculateAverages(filteredSavant, 'attack_angle');
    const avgLaunchAngle = calculateAverages(filteredSavant, 'launch_angle');
    
    const avgPlaneScore = calculateAverages(blastEvents, 'オンプレーンスコア');
    const avgConnection = calculateAverages(blastEvents, '体とバットの角度スコア');
    const avgRotation = calculateAverages(blastEvents, '体の回転による加速スコア');
    const avgSwingTime = calculateAverages(blastEvents, 'スイング時間 (sec)');

    const barrelEvents = filteredSavant.filter(e => isBarrel(parseNumeric(e.launch_speed), parseNumeric(e.launch_angle)));
    const barrelRate = filteredSavant.length > 0 ? (barrelEvents.length / filteredSavant.length * 100).toFixed(1) : 0;

    const hardHitEvents = filteredSavant.filter(e => {
      const velo = parseNumeric(e.launch_speed);
      const veloKmh = velo < 130 ? velo * MPH_TO_KMH : velo;
      return veloKmh >= 152.8;
    });
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

  const radarData = useMemo(() => [
    { subject: 'スイング速度', A: Math.min(100, (statsSummary.avgBatSpeed / 130) * 100), fullMark: 100, value: statsSummary.avgBatSpeed.toFixed(1) + ' km/h' },
    { subject: '打球速度', A: Math.min(100, (statsSummary.avgExitVelo / 165) * 100), fullMark: 100, value: statsSummary.avgExitVelo.toFixed(1) + ' km/h' },
    { subject: 'コンタクト', A: statsSummary.avgPlaneScore, fullMark: 100, value: statsSummary.avgPlaneScore.toFixed(1) + ' %' },
    { subject: '回転加速', A: statsSummary.avgRotation, fullMark: 100, value: statsSummary.avgRotation.toFixed(1) },
    { subject: '角度調整', A: statsSummary.avgConnection, fullMark: 100, value: statsSummary.avgConnection.toFixed(1) },
  ], [statsSummary]);

  const scatterData = useMemo(() => {
    return filteredSavant
      .filter(e => !isNaN(parseNumeric(e.bat_speed)) && !isNaN(parseNumeric(e.attack_angle)))
      .map(e => {
        const bs = parseNumeric(e.bat_speed);
        const ev = parseNumeric(e.launch_speed) || 0;
        return {
          batSpeed: bs < 100 ? bs * MPH_TO_KMH : bs,
          attackAngle: parseNumeric(e.attack_angle),
          exitVelo: ev < 130 ? ev * MPH_TO_KMH : ev
        };
      });
  }, [filteredSavant]);

  const { 
    avgBatSpeed, maxBatSpeed, avgAttackAngle, avgExitVelo, maxExitVelo, avgLaunchAngle,
    avgPlaneScore, avgConnection, avgRotation, avgSwingTime,
    barrelRate, hardHitRate, sweetSpotRate 
  } = statsSummary;

  return (
    <>
      {/* 印刷用CSSの注入: 印刷時はサイト全体を消し、レポートのみ表示 */}
      <style>{`
        @media screen { .print-only { display: none; } }
        @media print {
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: #0f172a !important;
            display: flex !important;
            justify-content: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
          .print-only { 
            display: block !important; 
            background: #0f172a !important;
            color: white !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            position: relative !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* 1. メインUI (画面で見ているもの) */}
      <div className="mt-4 md:mt-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#ffffff]">{playerName}</h2>
            <p className="text-gray-400 text-sm mt-1 font-bold">打撃分析レポート</p>
          </div>
          <div className="flex gap-2 md:gap-4 items-center flex-wrap">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 rounded-xl transition-all text-xs md:text-sm"
            >
              <Printer className="w-4 h-4" /> <span>PDF保存</span>
            </button>
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button onClick={() => setHitsOnly(false)} className={`px-3 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-all ${!hitsOnly ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>ALL</button>
              <button onClick={() => setHitsOnly(true)} className={`px-3 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-all ${hitsOnly ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>HITS</button>
            </div>
            <div className="flex gap-1.5 md:gap-2">
              <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-900/50 text-blue-300 rounded-full text-[10px] md:text-xs border border-blue-800">Savant: {filteredSavant.length}</span>
              <span className="px-2 py-0.5 md:px-3 md:py-1 bg-purple-900/50 text-purple-300 rounded-full text-[10px] md:text-xs border border-purple-800">Blast: {blastEvents.length}</span>
            </div>
          </div>
        </div>

        {/* フィルターセクション */}
        <div className="bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <span className="text-xs md:text-sm font-bold text-slate-300">Launch Angle: <span className="text-blue-400 font-mono">{laRange[0]}° ~ {laRange[1]}°</span></span>
                <button onClick={() => setLaRange([-90, 90])} className="text-[10px] text-slate-500 hover:text-white">Reset</button>
              </div>
              <div className="relative h-2 bg-slate-700 rounded-full">
                <input type="range" min="-90" max="90" value={laRange[0]} onChange={(e) => setLaRange([Math.min(Number(e.target.value), laRange[1]), laRange[1]])} className="absolute w-full h-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full" />
                <input type="range" min="-90" max="90" value={laRange[1]} onChange={(e) => setLaRange([laRange[0], Math.max(Number(e.target.value), laRange[0])])} className="absolute w-full h-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[[10, 40], [-10, 20], [25, 90], [-90, 5]].map(([min, max], idx) => (
                <button key={idx} onClick={() => setLaRange([min, max])} className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${laRange[0] === min && laRange[1] === max ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                  {idx === 0 ? 'Line Drive' : idx === 1 ? 'Ground' : idx === 2 ? 'Fly' : 'Down'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* スタッツカード */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 rounded-xl border border-blue-700 bg-blue-900/10 border-l-4 border-l-blue-500 shadow-lg">
            <div className="flex items-center justify-between mb-2"><h4 className="text-gray-400 text-xs font-medium uppercase">バットスピード</h4><Zap className="w-4 h-4 text-blue-500" /></div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1"><span className="text-2xl font-black text-white">{avgBatSpeed.toFixed(1)}</span><span className="text-[10px] text-slate-500 font-bold">km/h</span></div>
              <div className="flex items-baseline gap-1"><span className="text-lg font-bold text-blue-400">{maxBatSpeed.toFixed(1)}</span><span className="text-[8px] text-slate-500 font-bold uppercase">MAX</span></div>
            </div>
          </div>
          <StatCard title="Hard Hit %" value={`${hardHitRate}%`} icon={Gauge} colorClass="border-l-4 border-l-red-500" />
          <StatCard title="Barrel %" value={`${barrelRate}%`} icon={TrendingUp} colorClass="border-l-4 border-l-yellow-500" />
          <StatCard title="Sweet Spot %" value={`${sweetSpotRate}%`} icon={Target} colorClass="border-l-4 border-l-orange-500" />
          <div className="p-4 rounded-xl border border-emerald-700 bg-emerald-900/10 border-l-4 border-l-emerald-500 shadow-lg">
            <div className="flex items-center justify-between mb-2"><h4 className="text-gray-400 text-xs font-medium uppercase">打球速度</h4><BarChart3 className="w-4 h-4 text-emerald-500" /></div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1"><span className="text-2xl font-black text-white">{avgExitVelo.toFixed(1)}</span><span className="text-[10px] text-slate-500 font-bold">km/h</span></div>
              <div className="flex items-baseline gap-1"><span className="text-lg font-bold text-emerald-400">{maxExitVelo.toFixed(1)}</span><span className="text-[8px] text-slate-500 font-bold uppercase">MAX</span></div>
            </div>
          </div>
          <StatCard title="平均打球角度" value={`${avgLaunchAngle.toFixed(1)}°`} icon={Activity} colorClass="border-l-4 border-l-purple-500 col-span-2 lg:col-span-1" />
        </div>

        {/* チャートセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          <div className="lg:col-span-2 bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl flex flex-col items-center">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center self-start"><ShieldCheck className="w-5 h-5 mr-2 text-blue-400" />総合評価</h3>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                  <Radar name={playerName} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl min-w-[120px]">
                            <div className="text-blue-400 font-bold text-sm mb-1">{data.subject}</div>
                            <div className="text-white text-xl font-black">{data.value}</div>
                            <div className="text-slate-400 text-xs mt-1 font-medium">上位 {Math.max(1, 100 - data.A).toFixed(1)}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Overall Percentile</span>
              <div className="text-2xl font-black text-blue-400">上位 {Math.max(1, 100 - (radarData.reduce((a, b) => a + b.A, 0) / 5)).toFixed(1)} %</div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center"><span className="bg-purple-500 w-1.5 h-5 rounded-full mr-3"></span>Blast Motion 分析</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'オンプレーン', val: avgPlaneScore, unit: '%' },
                { label: 'コネクション', val: avgConnection, unit: '' },
                { label: 'ローテーション', val: avgRotation, unit: '' },
                { label: 'スイング時間', val: avgSwingTime, unit: 's', decimals: 2 }
              ].map((m, i) => (
                <div key={i} className="bg-slate-900/80 p-4 rounded-2xl text-center border border-slate-700 hover:border-purple-500/50 transition-all">
                  <div className="text-slate-500 text-[10px] mb-2 uppercase">{m.label}</div>
                  <div className="text-2xl text-white font-black">
                    {m.val.toFixed(m.decimals || 1)}{m.unit && <span className="text-xs ml-0.5 opacity-40">{m.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-slate-900/40 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4"><span className="text-xs font-bold text-slate-300">スイング効率 (オンプレーン%)</span><span className="text-white font-bold">{avgPlaneScore.toFixed(1)}%</span></div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full" style={{ width: `${avgPlaneScore}%` }}></div></div>
            </div>
          </div>
        </div>

        {/* 散布図セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 h-[400px] shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-6 text-center">打球速度 (km/h) vs アッパースイング度</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis type="number" dataKey="exitVelo" name="Exit Velocity" unit="km/h" stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="attackAngle" name="Attack Angle" unit="°" stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs">
                          <div className="text-emerald-400 font-bold mb-1">打球データ</div>
                          <div className="text-white">Attack Angle: <span className="font-mono">{data.attackAngle.toFixed(1)}°</span></div>
                          <div className="text-white">Exit Velocity: <span className="font-mono">{data.exitVelo.toFixed(1)} km/h</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Swings" data={scatterData} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 h-[400px] shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-6 text-center">バットスピード (km/h) vs 打球速度 (km/h)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis type="number" dataKey="batSpeed" name="Bat Speed" unit="km/h" stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="exitVelo" name="Exit Velocity" unit="km/h" stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs">
                          <div className="text-blue-400 font-bold mb-1">スイングデータ</div>
                          <div className="text-white">Bat Speed: <span className="font-mono">{data.batSpeed.toFixed(1)} km/h</span></div>
                          <div className="text-white">Exit Velocity: <span className="font-mono">{data.exitVelo.toFixed(1)} km/h</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Swings" data={scatterData} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 詳細データテーブル */}
        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl overflow-hidden">
          <h3 className="text-base font-bold text-white mb-6 text-center">Blast 詳細データ (Top 30)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-slate-900/80 sticky top-0">
                <tr><th className="px-4 py-3 border-b border-slate-700">オンプレーン</th><th className="px-4 py-3 border-b border-slate-700">構え角度</th><th className="px-4 py-3 border-b border-slate-700">インパクト角度</th><th className="px-4 py-3 border-b border-slate-700">パワー</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {blastEvents.slice(0, 30).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-700/30">
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

      {/* 2. 印刷専用レポート (バランスと色味を徹底改善) */}
      <div className="print-only" style={{ background: '#0f172a', color: '#fff', padding: '0', height: '297mm', width: '210mm', overflow: 'hidden', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
        {/* 統一ヘッダー - スペース削減 */}
        <div style={{ background: '#0f172a', color: '#fff', padding: '10px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '6px solid #3b82f6' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '4px' }}>パフォーマンス診断</div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0', lineHeight: '1.1', letterSpacing: '-0.5px', color: '#ffffff' }}>{playerName}</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#3b82f6', letterSpacing: '1px' }}>BASEBALL ANALYZER</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '3px', fontWeight: 'bold' }}>発行日: {new Date().toLocaleDateString('ja-JP')}</div>
          </div>
        </div>

        <div style={{ padding: '35px 40px 10px 40px' }}>
          {/* 統一されたスタッツカード */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '15px' }}>
            {[
              { label: '平均バットスピード', val: avgBatSpeed, unit: 'km/h', color: '#3b82f6', max: maxBatSpeed },
              { label: '平均打球速度', val: avgExitVelo, unit: 'km/h', color: '#10b981', max: maxExitVelo },
              { label: '平均打球角度', val: avgLaunchAngle, unit: '°', color: '#8b5cf6', detail: `アッパー度: ${avgAttackAngle.toFixed(1)}°` }
            ].map((stat, i) => (
              <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{stat.val.toFixed(1)}<span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '4px' }}>{stat.unit}</span></div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: stat.color, marginTop: '8px' }}>
                  {stat.max ? `最大: ${stat.max.toFixed(1)} km/h` : stat.detail}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '35px' }}>
            {/* 総合評価 - デザイン統一 */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', margin: '0' }}>総合評価分析</h3>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>パーセンタイル</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6' }}>上位 {Math.max(1, 100 - (radarData.reduce((a, b) => a + b.A, 0) / 5)).toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ width: '100%', height: '320px', display: 'flex', justifyContent: 'center' }}>
                <RadarChart width={350} height={320} data={radarData}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="subject" stroke="#475569" fontSize={11} fontWeight="bold" />
                  <Radar name={playerName} dataKey="A" stroke="#0f172a" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </div>
            </div>

            {/* Blast指標 - デザイン統一 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '25px', flex: '1' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginBottom: '20px' }}>Blast Motion 分析</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {[
                    { label: 'オンプレーン', val: avgPlaneScore, unit: '%' },
                    { label: 'コネクション', val: avgConnection, unit: '°' },
                    { label: 'ローテーション', val: avgRotation, unit: '' },
                    { label: 'スイング時間', val: avgSwingTime, unit: 's', decimals: 2 }
                  ].map((m, i) => (
                    <div key={i} style={{ padding: '15px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '5px' }}>{m.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{m.val.toFixed(m.decimals || 1)}<span style={{ fontSize: '10px', color: '#94a3b8' }}>{m.unit}</span></div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '25px', color: '#000000', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>スイング効率</div>
                <div style={{ fontSize: '48px', fontWeight: '900', color: '#000000', lineHeight: '1' }}>{avgPlaneScore.toFixed(1)}%</div>
                <div style={{ marginTop: '15px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${avgPlaneScore}%`, background: '#3b82f6' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 散布図セクション - ページバランス改善 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
             <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '0', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textAlign: 'center', marginTop: '15px', marginBottom: '0' }}>打球速度 vs アッパースイング度</h4>
                <div style={{ width: '340px', height: '270px' }}>
                  <ScatterChart width={340} height={270} margin={{ top: 25, right: 65, bottom: 25, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis type="number" dataKey="exitVelo" stroke="#94a3b8" fontSize={8} fontWeight="bold" tick={{ fill: '#94a3b8' }} />
                    <YAxis type="number" dataKey="attackAngle" stroke="#94a3b8" fontSize={8} fontWeight="bold" tick={{ fill: '#94a3b8' }} />
                    <Scatter data={scatterData} fill="#10b981" fillOpacity={0.6} />
                  </ScatterChart>
                </div>
             </div>
             <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '0', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textAlign: 'center', marginTop: '15px', marginBottom: '0' }}>バットスピード vs 打球速度</h4>
                <div style={{ width: '340px', height: '270px' }}>
                  <ScatterChart width={340} height={270} margin={{ top: 25, right: 65, bottom: 25, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis type="number" dataKey="batSpeed" stroke="#94a3b8" fontSize={8} fontWeight="bold" tick={{ fill: '#94a3b8' }} />
                    <YAxis type="number" dataKey="exitVelo" stroke="#94a3b8" fontSize={8} fontWeight="bold" tick={{ fill: '#94a3b8' }} />
                    <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.6} />
                  </ScatterChart>
                </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlayerProfile;
