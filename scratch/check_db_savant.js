
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lrjdtnkoljuftssakvlc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q9BpkJXMvxq6BNHtZGdxmg_Mddq4Y_9';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
  const { data, error } = await supabase
    .from('savant_data')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No data found in savant_data table.');
  }
}

checkColumns();
