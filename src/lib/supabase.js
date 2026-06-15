import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsbjpzrhetgnheafdimi.supabase.co';
const supabaseKey = 'sb_publishable_VMR-4FPvdfjkqsGGn-VRyg_9t4YxMRw';

export const supabase = createClient(supabaseUrl, supabaseKey);
