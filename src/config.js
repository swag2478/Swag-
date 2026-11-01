// Configuration publique de Swag. Ces valeurs sont visibles par tous les visiteurs : c'est normal,
// la clé « anon » de Supabase est faite pour être publique (les droits sont fixés par les règles RLS de la table members).
// Ne mets ici AUCUNE adresse e-mail ni clé « service_role ».
window.SWAG_CONFIG={
  supabaseUrl:"",      // ex. https://abcdefghijkl.supabase.co  (Supabase → Project Settings → API → Project URL)
  supabaseAnonKey:"",  // Supabase → Project Settings → API → Project API keys → anon public
  offlineDays:30       // nombre de jours d'accès hors ligne après la dernière vérification de l'adhésion
};
