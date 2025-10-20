// Configuración de Supabase
// Reemplaza estos valores con los de tu proyecto Supabase

const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Ejemplo: 'https://xyzcompany.supabase.co'
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // Tu clave pública de Supabase
};

// Inicializar Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Exportar para uso en otros archivos
window.supabaseClient = supabaseClient;



