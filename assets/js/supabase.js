import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Cole a URL real do seu projeto aqui (exemplo: 'https://xyzcompany.supabase.co')
const supabaseUrl = 'https://arugwldlapxhczwxodwa.supabase.co';

// Cole a sua Publishable Key (começa com sb_publishable_...)
const supabaseKey = 'sb_publishable_shWNPWCbXBZFniY8tqPQxQ_WxGPajU9';

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log("Supabase instanciado com sucesso.");