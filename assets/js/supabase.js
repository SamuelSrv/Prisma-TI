// assets/js/supabase.js

// 1. Biblioteca do Supabase diretamente do servidor CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 2. API's conexão supabase
const supabaseUrl = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydWd3bGRsYXB4aGN6d3hvZHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDc0MDgsImV4cCI6MjEwMTUyMzQwOH0.wgM3exGwo6O1a_oLfpnuGPFk2sFUr-aV1oTwV-TF-w8';
const supabaseKey = 'sb_publishable_shWNPWCbXBZFniY8tqPQxQ_WxGPajU9';

// 3. Inicializa e exporta a conexão para os outros arquivos usarem
export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Conexão com o BD inicializada.");