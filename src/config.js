// Configuration publique de Swag. Ces valeurs sont visibles par tous les visiteurs : c'est normal,
// la clé « anon » de Supabase est faite pour être publique (les droits sont fixés par les règles RLS de la table members).
// Ne mets ici AUCUNE adresse e-mail ni clé « service_role ».
window.SWAG_CONFIG={
  supabaseUrl:"https://srzzqtubmxruqoenmkzn.supabase.co",      // ex. https://abcdefghijkl.supabase.co  (Supabase → Project Settings → API → Project URL)
  supabaseAnonKey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyenpxdHVibXhydXFvZW5ta3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDQ5NzEsImV4cCI6MjEwOTEyMDk3MX0.GNFH9Ipy9YrMpS9yjHsohWMDgY4uKlBPd98SUuMSJ5Q",  // Supabase → Project Settings → API → Project API keys → anon public
  offlineDays:30       // nombre de jours d'accès hors ligne après la dernière vérification de l'adhésion
};
