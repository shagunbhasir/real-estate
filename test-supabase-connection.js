import { supabase } from './supabase/supabase.ts';

async function testSupabaseConnection() {
  try {
    // A simple query to test the connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact' }).limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return false;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Data:', data);
    return true;
  } catch (err) {
    console.error('Exception when connecting to Supabase:', err);
    return false;
  }
}

testSupabaseConnection();
