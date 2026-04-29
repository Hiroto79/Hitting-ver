// Helper to extract unique teams from Savant data
export const extractTeams = (savantData) => {
  if (!savantData) return [];
  const teams = new Set();
  savantData.forEach(row => {
    if (row.home_team) teams.add(row.home_team);
    if (row.away_team) teams.add(row.away_team);
  });
  return Array.from(teams).sort();
};

// Helper to extract players belonging to a specific team
export const extractPlayersByTeam = (savantData, team, nameKey = 'player_name') => {
  if (!savantData || !team) return [];
  const players = new Set();
  
  savantData.forEach(row => {
    // If inning is Top, batter is Away team. If Bot, batter is Home team.
    const batterTeam = row.inning_topbot === 'Top' ? row.away_team : row.home_team;
    if (batterTeam === team && row[nameKey]) {
      players.add(String(row[nameKey])); // Store as string for consistent comparison
    }
  });
  
  return Array.from(players).sort();
};

// Helper to get stats for a specific player
export const getPlayerStats = (savantData, blastData, playerName, nameKey = 'player_name') => {
  // Use fuzzy equality (==) or String conversion to handle cases where ID is parsed as number
  const savantEvents = savantData ? savantData.filter(row => String(row[nameKey]) === String(playerName)) : [];
  
  // Blast data doesn't explicitly have the same "player_name" column if it's named differently,
  // but let's assume either the filename matches or there's a name column. 
  // Blast CSV usually has "Player" or it might just be the whole file for one player.
  // The user said "それ以外のバット起動の数値はブラストで", we will assume the uploaded Blast data 
  // corresponds to the selected player if there is no explicit Player column in Blast, 
  // or we just use all Blast data assuming they upload per-player, or we filter if a column exists.
  // Looking at Blast headers: "日付", "バット", etc., there is no "選手名". So Blast data is likely per-player.
  const blastEvents = blastData || [];

  return {
    savantEvents,
    blastEvents
  };
};

export const parseNumeric = (val) => {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number') return val;
  // Handle strings with units like "100.5 mph"
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const isBarrel = (ev, la) => {
  if (isNaN(ev) || isNaN(la) || ev < 98) return false;
  // Statcast Barrel definition: 98mph -> 26-30 deg. 
  // Range expands 1 degree each way for every 1 mph increase.
  const lower = 26 - (ev - 98);
  const upper = 30 + (ev - 98);
  return la >= lower && la <= upper;
};

export const isHit = (event) => {
  if (!event) return false;
  const hits = ['single', 'double', 'triple', 'home_run'];
  return hits.includes(event.toLowerCase());
};

export const calculateStats = (events) => {
  if (!events || events.length === 0) return { ba: 0, slg: 0, totalBases: 0, ab: 0 };
  
  // Filter for events that count as an At-Bat
  // This is a simplification, but covers the basics
  const abEvents = events.filter(e => {
    const ev = e.events ? e.events.toLowerCase() : '';
    return ev && !['walk', 'hit_by_pitch', 'intent_walk', 'sac_fly', 'sac_bunt', 'catcher_interf'].includes(ev);
  });
  
  if (abEvents.length === 0) return { ba: 0, slg: 0, totalBases: 0, ab: 0 };
  
  const hitsCount = abEvents.filter(e => isHit(e.events)).length;
  const ba = (hitsCount / abEvents.length);
  
  const totalBases = abEvents.reduce((acc, e) => {
    const ev = e.events ? e.events.toLowerCase() : '';
    if (ev === 'single') return acc + 1;
    if (ev === 'double') return acc + 2;
    if (ev === 'triple') return acc + 3;
    if (ev === 'home_run') return acc + 4;
    return acc;
  }, 0);
  
  const slg = (totalBases / abEvents.length);
  
  return { ba, slg, totalBases, ab: abEvents.length };
};

export const calculateAverages = (events, key) => {
  if (!events || events.length === 0) return 0;
  const validEvents = events.filter(e => e[key] !== null && e[key] !== undefined && !isNaN(parseNumeric(e[key])));
  if (validEvents.length === 0) return 0;
  const sum = validEvents.reduce((acc, e) => acc + parseNumeric(e[key]), 0);
  return (sum / validEvents.length);
};

export const calculateMax = (events, key) => {
  if (!events || events.length === 0) return 0;
  let max = 0;
  events.forEach(e => {
    const val = parseNumeric(e[key]);
    if (!isNaN(val) && val > max) max = val;
  });
  return max;
};

// Group events by team and then by player for O(N) lookup
export const groupEventsByTeamAndPlayer = (data, nameKey = 'player_name') => {
  if (!data || !Array.isArray(data)) return {};
  
  return data.reduce((acc, row) => {
    const team = row.home_team || 'Unknown Team';
    // 修正: 選手名が数値（ID）の場合でも文字列として扱い、正しくグループ化できるようにする
    const rawName = row[nameKey];
    const player = (rawName === null || rawName === undefined) ? 'Unknown Player' : String(rawName);
    
    if (!acc[team]) acc[team] = {};
    if (!acc[team][player]) acc[team][player] = [];
    acc[team][player].push(row);
    return acc;
  }, {});
};
