/**
 * Pure message catalogs. One nested object per locale, all sharing the **same
 * shape**: the `en` catalog is the canonical structure, every other locale is
 * typed as `typeof messages.en` so TypeScript fails if a key is missing.
 *
 * No React/Next imports here — this module is safe to load from server,
 * client, edge, or build-time code.
 */

export type Locale = 'en' | 'es' | 'fr' | 'tl'

// The `en` catalog is the canonical shape. We freeze it with `as const` so
// keys autocomplete narrowly, then derive `Messages` by widening every leaf
// to `string` — that gives type-checkers the *shape* (all keys present) of
// the contract while still allowing other locales to supply different strings.
const enRaw = {
  nav: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    employees: 'Employees',
    labour: 'Labour',
    expenses: 'Expenses',
    reports: 'Reports',
    preferences: 'Preferences',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    back: 'Back',
    loading: 'Loading…',
    saved: 'Saved.',
    genericError: 'Something went wrong. Please try again.',
  },
  auth: {
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    signOut: 'Sign out',
    email: 'Email',
    password: 'Password',
    signInTitle: 'SR&ED Manager',
    signInSubtitle: 'Sign in to continue.',
    invalidCredentials: 'Invalid email or password.',
    sessionExpired: 'Your session expired. Please sign in again.',
  },
  dashboard: {
    welcome: 'Welcome, {name}',
  },
  prefs: {
    userTab: 'User',
    companyTab: 'Company',
    timezone: 'Time zone',
    timezoneHelp: 'Dates throughout the app are shown in this timezone.',
    language: 'Language',
    languageHelp: 'Interface language. Some entity labels remain in English.',
    role: 'Role / Title',
    savePreferences: 'Save preferences',
    preferencesSaved: 'Preferences saved.',
    readOnlyNote: 'Only administrators can change company preferences.',
  },
} as const

// Widen literal types to `string` so other locales can satisfy the shape
// without their translations being constrained to the English literal.
export type Messages = {
  [K in keyof typeof enRaw]: { [L in keyof (typeof enRaw)[K]]: string }
}

const en: Messages = enRaw

const es: Messages = {
  nav: {
    dashboard: 'Panel',
    projects: 'Proyectos',
    employees: 'Empleados',
    labour: 'Horas',
    expenses: 'Gastos',
    reports: 'Informes',
    preferences: 'Preferencias',
  },
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    add: 'Añadir',
    back: 'Volver',
    loading: 'Cargando…',
    saved: 'Guardado.',
    genericError: 'Algo salió mal. Inténtalo de nuevo.',
  },
  auth: {
    signIn: 'Iniciar sesión',
    signingIn: 'Iniciando sesión…',
    signOut: 'Cerrar sesión',
    email: 'Correo electrónico',
    password: 'Contraseña',
    signInTitle: 'SR&ED Manager',
    signInSubtitle: 'Inicia sesión para continuar.',
    invalidCredentials: 'Correo o contraseña incorrectos.',
    sessionExpired: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  },
  dashboard: {
    welcome: 'Bienvenido, {name}',
  },
  prefs: {
    userTab: 'Usuario',
    companyTab: 'Empresa',
    timezone: 'Zona horaria',
    timezoneHelp:
      'Las fechas se muestran en esta zona horaria en toda la aplicación.',
    language: 'Idioma',
    languageHelp:
      'Idioma de la interfaz. Algunas etiquetas permanecen en inglés.',
    role: 'Cargo / Título',
    savePreferences: 'Guardar preferencias',
    preferencesSaved: 'Preferencias guardadas.',
    readOnlyNote:
      'Solo los administradores pueden cambiar las preferencias de la empresa.',
  },
}

const fr: Messages = {
  nav: {
    dashboard: 'Tableau de bord',
    projects: 'Projets',
    employees: 'Employés',
    labour: 'Heures',
    expenses: 'Dépenses',
    reports: 'Rapports',
    preferences: 'Préférences',
  },
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    add: 'Ajouter',
    back: 'Retour',
    loading: 'Chargement…',
    saved: 'Enregistré.',
    genericError: 'Une erreur est survenue. Veuillez réessayer.',
  },
  auth: {
    signIn: 'Se connecter',
    signingIn: 'Connexion…',
    signOut: 'Se déconnecter',
    email: 'Courriel',
    password: 'Mot de passe',
    signInTitle: 'SR&ED Manager',
    signInSubtitle: 'Connectez-vous pour continuer.',
    invalidCredentials: 'Courriel ou mot de passe invalide.',
    sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
  },
  dashboard: {
    welcome: 'Bienvenue, {name}',
  },
  prefs: {
    userTab: 'Utilisateur',
    companyTab: 'Entreprise',
    timezone: 'Fuseau horaire',
    timezoneHelp:
      'Les dates sont affichées dans ce fuseau horaire partout dans l’application.',
    language: 'Langue',
    languageHelp:
      'Langue de l’interface. Certaines étiquettes restent en anglais.',
    role: 'Rôle / Titre',
    savePreferences: 'Enregistrer les préférences',
    preferencesSaved: 'Préférences enregistrées.',
    readOnlyNote:
      'Seuls les administrateurs peuvent modifier les préférences de l’entreprise.',
  },
}

const tl: Messages = {
  nav: {
    dashboard: 'Dashboard',
    projects: 'Mga Proyekto',
    employees: 'Mga Empleyado',
    labour: 'Paggawa',
    expenses: 'Mga Gastusin',
    reports: 'Mga Ulat',
    preferences: 'Mga Kagustuhan',
  },
  common: {
    save: 'I-save',
    cancel: 'Kanselahin',
    edit: 'I-edit',
    delete: 'Burahin',
    add: 'Magdagdag',
    back: 'Bumalik',
    loading: 'Naglo-load…',
    saved: 'Na-save.',
    genericError: 'May nangyaring mali. Pakisubukang muli.',
  },
  auth: {
    signIn: 'Mag-sign in',
    signingIn: 'Nagsa-sign in…',
    signOut: 'Mag-sign out',
    email: 'Email',
    password: 'Password',
    signInTitle: 'SR&ED Manager',
    signInSubtitle: 'Mag-sign in para magpatuloy.',
    invalidCredentials: 'Maling email o password.',
    sessionExpired: 'Nag-expire na ang iyong session. Mag-sign in muli.',
  },
  dashboard: {
    welcome: 'Mabuhay, {name}',
  },
  prefs: {
    userTab: 'User',
    companyTab: 'Kumpanya',
    timezone: 'Time zone',
    timezoneHelp:
      'Ang mga petsa ay ipinapakita sa time zone na ito sa buong app.',
    language: 'Wika',
    languageHelp: 'Wika ng interface. Ilang label ay nananatiling Ingles.',
    role: 'Posisyon / Titulo',
    savePreferences: 'I-save ang mga kagustuhan',
    preferencesSaved: 'Na-save ang mga kagustuhan.',
    readOnlyNote:
      'Tanging mga administrator ang makakapagbago ng kagustuhan ng kumpanya.',
  },
}

export const messages: Record<Locale, Messages> = { en, es, fr, tl }
