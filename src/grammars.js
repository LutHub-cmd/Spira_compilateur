'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// GRAMMAIRES
//
// Rôle : définir les mots-clés, les messages d'erreur et les fonctions
// intégrées pour chaque langue supportée par Spira (français, anglais, espagnol).
//
// Ce fichier ne contient pas de logique d'exécution. C'est uniquement des
// données : des objets JavaScript qui décrivent comment chaque langue "parle".
//
// Grâce à cette architecture, ajouter une nouvelle langue = ajouter un bloc
// dans GRAMMARS sans toucher au reste du compilateur.
// ─────────────────────────────────────────────────────────────────────────────

const GRAMMARS = {

  // ─── Français ──────────────────────────────────────────────────────────────
  fr: {
    name: 'Français', family: 'SVO', direction: 'LTR',

    // Mots-clés : chaque clé est le nom interne (utilisé dans le code du compilateur),
    // chaque valeur est le mot dans la langue de l'utilisateur.
    // Le tokenizer utilise ce tableau à l'envers : mot → nom interne.
    keywords: {
      LET:'soit',       // Déclaration de variable          : soit x = 5
      IF:'si',          // Début de condition               : si x > 0 alors
      THEN:'alors',     // Séparateur condition/corps       : si ... alors ...
      ELSE:'sinon',     // Branche alternative              : sinon ...
      END:'fin',        // Fin d'un bloc (fonction, boucle, condition)
      PRINT:'afficher', // Afficher dans la console         : afficher "bonjour"
      WHILE:'tantque',  // Boucle "tant que"                : tantque x < 10 répéter
      DO:'répéter',     // Début du corps de boucle
      MAKE:'faire',     // Définir une fonction             : faire saluer avec prénom
      GIVE:'donner',    // Retourner une valeur             : donner résultat
      WITH:'avec',      // Introduire les paramètres        : faire f avec a, b
      ADD_TO:'ajouter', // Ajouter à une liste              : ajouter x à maliste
      TO:'à',           // Complément de ajouter
      IMPORT:'utiliser',// Importer un module               : utiliser "maths.sp"
      FOREACH:'pour',   // Boucle pour chaque               : pour chaque x dans liste
      EACH:'chaque',
      IN:'dans',
      TEST:'tester',    // Définir un test                  : tester "nom" ... fin
      ASSERT:'vérifier',// Assertion                        : vérifier que x == 5
      THAT:'que',
      TRUE:'vrai',      // Booléens
      FALSE:'faux',
      AND:'et',         // Opérateurs logiques
      OR:'ou',
      NOT:'non',
      NOTHING:'Rien'    // Valeur nulle (équivalent de null)
    },

    // Messages d'erreur affichés à l'utilisateur quand le compilateur détecte un problème.
    errors: {
      UNKNOWN_TOKEN:    'Symbole inconnu',
      UNEXPECTED_TOKEN: 'Symbole inattendu',
      EXPECTED:         'Attendu',
      UNDEFINED_VAR:    'Variable non définie',
      DIV_ZERO:         'Division par zéro',
      UNCLOSED_STRING:  'Chaîne non fermée',
      INFINITE_LOOP:    'Boucle infinie détectée',
      UNDEFINED_FUNC:   'Fonction non définie',
      ARG_MISMATCH:     'Nombre d\'arguments incorrect',
      INDEX_OUT:        'Index hors limites',
      ASSERTION_FAILED: 'Assertion échouée'
    },

    // Fonctions intégrées (builtins) : des fonctions que le compilateur connaît
    // nativement et traduit en appels JavaScript directs lors de la génération de code.
    // Ex : taille(liste) → liste.length en JavaScript
    builtins: {
      SIZE:'taille',       // Nombre d'éléments d'une liste
      ASK:'demander',      // Demander une saisie à l'utilisateur
      NUM:'nombre',        // Convertir en nombre
      TXT:'texte',         // Convertir en texte
      LEN:'longueur',      // Longueur d'une chaîne de caractères
      UPPER:'majuscules',  // Mettre en majuscules
      LOWER:'minuscules',  // Mettre en minuscules
      CONTAINS:'contient', // Vérifier si une liste/chaîne contient un élément
      SPLIT:'découper'     // Découper une chaîne en liste de morceaux
    }
  },

  // ─── Anglais ───────────────────────────────────────────────────────────────
  en: {
    name: 'English', family: 'SVO', direction: 'LTR',
    keywords: {
      LET:'let', IF:'if', THEN:'then', ELSE:'else', END:'end',
      PRINT:'display', WHILE:'while', DO:'repeat',
      MAKE:'make', GIVE:'give', WITH:'with',
      ADD_TO:'add', TO:'to', IMPORT:'use',
      FOREACH:'for', EACH:'each', IN:'in',
      TEST:'test', ASSERT:'assert', THAT:'that',
      TRUE:'true', FALSE:'false', AND:'and', OR:'or', NOT:'not', NOTHING:'Nothing'
    },
    errors: {
      UNKNOWN_TOKEN:'Unknown symbol', UNEXPECTED_TOKEN:'Unexpected symbol',
      EXPECTED:'Expected', UNDEFINED_VAR:'Undefined variable',
      DIV_ZERO:'Division by zero', UNCLOSED_STRING:'Unclosed string',
      INFINITE_LOOP:'Infinite loop detected',
      UNDEFINED_FUNC:'Undefined function', ARG_MISMATCH:'Wrong number of arguments',
      INDEX_OUT:'Index out of bounds', ASSERTION_FAILED:'Assertion failed'
    },
    builtins: {
      SIZE:'size', ASK:'ask', NUM:'number', TXT:'text',
      LEN:'length', UPPER:'uppercase', LOWER:'lowercase',
      CONTAINS:'contains', SPLIT:'split'
    }
  },

  // ─── Espagnol ──────────────────────────────────────────────────────────────
  es: {
    name: 'Español', family: 'SVO', direction: 'LTR',
    keywords: {
      LET:'sea', IF:'si', THEN:'entonces', ELSE:'sino', END:'fin',
      PRINT:'mostrar', WHILE:'mientras', DO:'repetir',
      MAKE:'hacer', GIVE:'dar', WITH:'con',
      ADD_TO:'agregar', TO:'a', IMPORT:'usar',
      FOREACH:'para', EACH:'cada', IN:'en',
      TEST:'probar', ASSERT:'verificar', THAT:'que',
      TRUE:'verdadero', FALSE:'falso', AND:'y', OR:'o', NOT:'no', NOTHING:'Nada'
    },
    errors: {
      UNKNOWN_TOKEN:'Símbolo desconocido', UNEXPECTED_TOKEN:'Símbolo inesperado',
      EXPECTED:'Esperaba', UNDEFINED_VAR:'Variable no definida',
      DIV_ZERO:'División por cero', UNCLOSED_STRING:'Cadena no cerrada',
      INFINITE_LOOP:'Bucle infinito detectado',
      UNDEFINED_FUNC:'Función no definida', ARG_MISMATCH:'Número de argumentos incorrecto',
      INDEX_OUT:'Índice fuera de rango', ASSERTION_FAILED:'Aserción fallida'
    },
    builtins: {
      SIZE:'tamaño', ASK:'preguntar', NUM:'numero', TXT:'texto',
      LEN:'longitud', UPPER:'mayusculas', LOWER:'minusculas',
      CONTAINS:'contiene', SPLIT:'dividir'
    }
  }
};


// ── Détecter la langue d'un fichier source ────────────────────────────────────
// Paramètres :
//   filename : le nom du fichier (utilisé comme fallback via l'extension)
//   source   : le contenu texte du fichier (optionnel)
//
// Retourne le code de langue : 'fr', 'en' ou 'es' (défaut : 'fr')
//
// Stratégie de détection (par ordre de priorité) :
//   1. Directive @langue en début de fichier : @langue fr  @langue en
//   2. Extension du fichier : fichier.en → anglais, fichier.fr → français
//   3. Fallback : français
function detectLanguage(filename, source) {
  if (source) {
    // Parcourir les premières lignes du fichier pour chercher @langue
    for (const line of source.split('\n')) {
      const t = line.trim();
      if (!t) continue; // Ignorer les lignes vides

      // Regex pour capturer "@langue xx" (ex: "@langue fr" → m[1] = "fr")
      const m = t.match(/^@langue\s+(\w+)/);
      if (m && GRAMMARS[m[1]]) return m[1]; // Langue trouvée et valide → retourner

      // Arrêter la recherche dès qu'on trouve du code qui n'est pas une directive/commentaire
      if (!t.startsWith('@') && !t.startsWith('—') && !t.startsWith('#') && !t.startsWith('//')) break;
    }
  }

  // Fallback : regarder l'extension du fichier
  // path.split('.').pop() → prend la dernière partie après le dernier "."
  // Exemple : "programme.fr" → "fr" → grammaire française
  const ext = filename.split('.').pop().toLowerCase();
  return GRAMMARS[ext] ? ext : 'fr';
}

module.exports = { GRAMMARS, detectLanguage };
