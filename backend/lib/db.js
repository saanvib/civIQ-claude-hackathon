import { createClient } from '@supabase/supabase-js'

// Lazy-initialized so the module loads safely before env vars are set.
let _supabase = null
function getClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are not set — add them to .env')
  }
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  }
  return _supabase
}

// Returns legislators for a state from Team C's legislators_cache table.
// chamber: 'senate' | 'house' | 'state-senate' | 'state-house' | 'all'
export async function getLegislators(state, chamber = 'all') {
  const supabase = getClient()
  let query = supabase
    .from('legislators_cache')
    .select('id, name, party, state, chamber, vote_vector')
    .eq('state', state.toUpperCase())

  if (chamber !== 'all') {
    query = query.eq('chamber', chamber)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}
