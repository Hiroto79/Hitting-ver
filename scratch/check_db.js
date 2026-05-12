
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data: bData, error: bError } = await supabase.from('rapsodo_batting').select('*').limit(1);
    if (bError) console.error('Batting Schema Error:', bError);
    else console.log('Batting Columns:', bData.length > 0 ? Object.keys(bData[0]) : 'No data');

    const { data: pData, error: pError } = await supabase.from('rapsodo_pitching').select('*').limit(1);
    if (pError) console.error('Pitching Schema Error:', pError);
    else console.log('Pitching Columns:', pData.length > 0 ? Object.keys(pData[0]) : 'No data');
}

checkSchema();
