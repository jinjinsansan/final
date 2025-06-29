import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get all diary entries with user information
    const { data, error } = await supabase
      .from('diary_entries')
      .select(`
        *,
        users(line_username)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching diary entries:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Format the data for the frontend
    const formattedData = data.map(entry => ({
      id: entry.id,
      date: entry.date,
      emotion: entry.emotion,
      event: entry.event,
      realization: entry.realization,
      selfEsteemScore: entry.self_esteem_score,
      worthlessnessScore: entry.worthlessness_score,
      counselor_memo: entry.counselor_memo,
      is_visible_to_user: entry.is_visible_to_user,
      counselor_name: entry.counselor_name,
      assigned_counselor: entry.assigned_counselor,
      urgency_level: entry.urgency_level,
      created_at: entry.created_at,
      user: {
        line_username: entry.users?.line_username
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formattedData)
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};