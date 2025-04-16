import { supabase } from '../supabase/supabase';

// This function tests the Supabase connection with detailed diagnostics
export async function testSupabaseConnection() {
  try {
    // Log the environment variables (without exposing full key)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Not set';
    const supabaseKeyStart = import.meta.env.VITE_SUPABASE_ANON_KEY ? 
      import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + '...' : 'Not set';
    
    console.log('🔍 Supabase Configuration:');
    console.log('URL:', supabaseUrl);
    console.log('API Key (first 10 chars):', supabaseKeyStart);
    
    console.log('🔄 Testing Supabase connection...');
    
    // First, test a simple health check
    console.log('Step 1: Testing basic connectivity');
    const { data: healthData, error: healthError } = await supabase.from('users').select('count', { count: 'exact' });
    
    if (healthError) {
      console.error('❌ Supabase connection error:', healthError);
      
      // Check for specific error types to provide better guidance
      if (healthError.code === 'PGRST301') {
        console.error('🔴 The "users" table might not exist in your database.');
      } else if (healthError.code === '401') {
        console.error('🔴 Authentication failed. Your API key might be invalid or expired.');
      } else if (healthError.code === 'ENOTFOUND' || healthError.code === 'ETIMEDOUT') {
        console.error('🔴 Network error. The Supabase URL might be incorrect or the service might be down.');
      }
      
      return { success: false, error: healthError };
    }
    
    // If we got here, the connection is working
    console.log('✅ Supabase connection successful!', healthData);
    
    // Try to get some actual data to further verify the connection
    console.log('Step 2: Testing data retrieval');
    const { data: usersData, error: usersError } = await supabase.from('users').select('*').limit(1);
    
    if (usersError) {
      console.warn('⚠️ Could connect to Supabase, but had issues retrieving data:', usersError);
      return { success: true, warning: usersError, data: healthData };
    }
    
    console.log('✅ Successfully retrieved data from Supabase!', usersData);
    return { success: true, data: { health: healthData, users: usersData } };
  } catch (err) {
    console.error('❌ Exception when connecting to Supabase:', err);
    return { success: false, error: err };
  }
}

// Run the test immediately
console.log('🧪 Starting Supabase connection test...');
testSupabaseConnection().then(result => {
  if (result.success) {
    console.log('%c✅ SUMMARY: Supabase backend and database are running!', 'color: green; font-weight: bold; font-size: 14px;');
  } else {
    console.error('%c❌ SUMMARY: Supabase backend or database connection failed!', 'color: red; font-weight: bold; font-size: 14px;');
    console.error('Error details:', result.error);
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('1. Check if your Supabase project is active at: https://app.supabase.com/project/_');
    console.log('2. Verify that your .env file has the correct URL and API key');
    console.log('3. Make sure the API key matches the project URL');
    console.log('4. Check if the "users" table exists in your database');
  }
});

// Export a component that can be imported in other files
export default function SupabaseConnectionTest() {
  return null;
}
