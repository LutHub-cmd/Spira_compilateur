'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// TOKENIZER (aussi appelé "Lexer")
//
// Rôle : lire le texte brut du programme Spira et le découper en une liste
// de "tokens" (jetons). Un token est le plus petit morceau de sens d'un
// programme : un nombre, un mot-clé ("si", "fin"), un opérateur ("+", "=="),
// une chaîne de caractères, etc.
//
// Exemple : le texte  soit x = 42 + 1
// devient les tokens : [LET "soit"] [IDENT "x"] [OP "="] [NUMBER 42] [OP "+"] [NUMBER 1]
//
// C'est la toute première étape d'un compilateur.
// ─────────────────────────────────────────────────────────────────────────────


// ─── Classe d'erreur personnalisée ───────────────────────────────────────────
// Une "classe" est un moule pour créer des objets avec les mêmes propriétés.
// Ici, SpiraError hérite (extends) de la classe Error de JavaScript, ce qui
// lui permet d'être attrapée par un bloc try/catch comme n'importe quelle erreur.
class SpiraError extends Error {
  // Le "constructor" est la fonction qui s'exécute quand on crée un objet
  // avec "new SpiraError(...)". Les paramètres sont les valeurs qu'on lui passe.
  constructor(message, line, col, grammar, source) {
    super(message);           // Appelle le constructor de la classe parente (Error)
    this.name     = 'SpiraError';
    this.spiraMsg = message;  // Le message d'erreur lisible par l'utilisateur
    this.line     = line;     // Numéro de ligne où se trouve l'erreur
    this.col      = col;      // Numéro de colonne où se trouve l'erreur
    this.grammar  = grammar;  // La grammaire active (fr, en, es…)
    this.source   = source || null; // Le code source original (pour afficher le contexte)
  }
}


// ─── Classe Tokenizer ─────────────────────────────────────────────────────────
// Un "Tokenizer" est un objet qui reçoit le code source (texte) et produit
// une liste de tokens. On lui passe aussi la grammaire pour savoir quels
// mots sont des mots-clés dans la langue choisie.
class Tokenizer {
  // Paramètres du constructor :
  //   source  : la chaîne de texte complète du fichier .sp à analyser
  //   grammar : l'objet grammaire (défini dans grammars.js) pour la langue active
  constructor(source, grammar) {
    this.source   = source;   // Le texte à analyser, caractère par caractère
    this.grammar  = grammar;  // La grammaire choisie (mots-clés, messages d'erreur)
    this.pos      = 0;        // Position actuelle dans le texte (index du prochain caractère)
    this.line     = 1;        // Numéro de ligne actuel (commence à 1)
    this.col      = 1;        // Numéro de colonne actuelle (commence à 1)
    this.tokens   = [];       // La liste de tokens qu'on va remplir progressivement

    // kwMap est un dictionnaire : mot → type de token
    // Ex : { "soit": "LET", "si": "IF", "fin": "END", ... }
    // On le construit à partir de grammar.keywords en inversant clé et valeur.
    this.kwMap    = {};
    for (const [kind, word] of Object.entries(grammar.keywords))
      this.kwMap[word.toLowerCase()] = kind;
    // Object.entries() transforme un objet en tableau de paires [clé, valeur].
    // Ici : [["LET","soit"], ["IF","si"], ...] → on met le mot en clé et le type en valeur.
  }

  // ── Méthode utilitaire : déclencher une erreur à la position actuelle
  // Une "méthode" est une fonction qui appartient à une classe.
  // "this" désigne l'objet courant (l'instance du Tokenizer).
  err(msg) {
    throw new SpiraError(msg, this.line, this.col, this.grammar, this.source);
  }

  // ── Regarder un caractère sans avancer (lecture "non-destructive")
  // peek(0) = le caractère courant, peek(1) = le suivant, etc.
  // Le paramètre "o" (offset) a une valeur par défaut de 0 grâce à "o || 0".
  peek(o)  { return this.source[this.pos + (o || 0)]; }

  // ── Lire un caractère ET avancer d'une position
  advance() {
    const ch = this.source[this.pos++]; // Lit le caractère et incrémente this.pos
    // Mise à jour du compteur de lignes/colonnes pour les messages d'erreur
    if (ch === '\n') { this.line++; this.col = 1; } else { this.col++; }
    return ch;
  }

  // ── Fonctions de classification de caractères (retournent vrai ou faux)
  isD(ch) { return ch >= '0' && ch <= '9'; }             // Est-ce un chiffre ?
  isA(ch) { return !!(ch && /[\p{L}_]/u.test(ch)); }     // Est-ce une lettre (unicode) ou _ ?
  isAN(ch){ return this.isA(ch) || this.isD(ch); }       // Est-ce une lettre ou un chiffre ?


  // ── Méthode principale : transformer tout le texte en liste de tokens ───────
  // C'est une "boucle principale" : on avance dans le texte jusqu'à la fin.
  // À chaque itération, on identifie le prochain token et on l'ajoute.
  tokenize() {
    while (this.pos < this.source.length) {
      this.skip(); // Sauter espaces et commentaires (ils n'ont pas de sens pour le compilateur)
      if (this.pos >= this.source.length) break;

      // Mémoriser la position de début du token (pour les messages d'erreur)
      const ln = this.line, co = this.col, ch = this.peek();

      // Chaque "if" teste le premier caractère pour savoir quel type de token c'est.
      if (this.isD(ch))  { this.tokens.push(this.rNum(ln, co)); continue; } // Nombre : 42, 3.14
      if (ch === '"')    { this.tokens.push(this.rStr(ln, co)); continue; } // Chaîne : "bonjour"
      if (this.isA(ch))  { this.tokens.push(this.rId(ln, co));  continue; } // Identifiant / mot-clé

      // Essayer de lire un opérateur (+, -, ==, etc.) ou de la ponctuation
      const op = this.rOp(ln, co);
      if (op) { this.tokens.push(op); continue; }

      // Aucun des cas connus → erreur
      this.err(this.grammar.errors.UNKNOWN_TOKEN + ': \'' + ch + '\' (code: ' + ch.charCodeAt(0) + ')');
    }

    // On ajoute un token spécial "fin de fichier" : le parser sait ainsi quand s'arrêter.
    this.tokens.push({ kind: 'EOF', value: null, line: this.line, col: this.col });
    return this.tokens;
  }


  // ── Sauter les espaces blancs et les commentaires ────────────────────────────
  // Les commentaires Spira commencent par : — (tiret em), #, @ ou //
  skip() {
    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (' \t\n\r'.includes(ch)) { this.advance(); continue; } // Espaces, tabulations, retours à la ligne

      // Commentaires : — (U+2014), #, @ déclenchent un saut jusqu'à la fin de ligne
      if (ch === '—' || ch === '#' || ch === '@') {
        while (this.pos < this.source.length && this.peek() !== '\n') this.advance();
        continue;
      }
      // Commentaire style C++ : //
      if (ch === '/' && this.peek(1) === '/') {
        while (this.pos < this.source.length && this.peek() !== '\n') this.advance();
        continue;
      }
      break; // Caractère utile trouvé : on sort de la boucle
    }
  }


  // ── Lire un nombre entier ou décimal ─────────────────────────────────────────
  // Paramètres ln, co : numéro de ligne/colonne du début du token (pour les erreurs).
  // Retourne un objet token : { kind: 'NUMBER', value: 42, line: ..., col: ... }
  rNum(ln, co) {
    let s = '';
    // Lire tous les chiffres consécutifs
    while (this.pos < this.source.length && this.isD(this.peek())) s += this.advance();
    // Si on voit "." suivi d'un chiffre → nombre décimal (ex: 3.14)
    if (this.peek() === '.' && this.isD(this.peek(1))) {
      s += this.advance(); // Consommer le "."
      while (this.pos < this.source.length && this.isD(this.peek())) s += this.advance();
    }
    return { kind: 'NUMBER', value: parseFloat(s), line: ln, col: co };
    // parseFloat() convertit la chaîne "42" ou "3.14" en nombre JavaScript.
  }


  // ── Lire une chaîne de caractères entre guillemets ───────────────────────────
  // Gère les séquences d'échappement : \n (saut de ligne), \t (tabulation), \\ (anti-slash)
  rStr(ln, co) {
    this.advance(); // Consommer le guillemet ouvrant "
    let s = '';
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance(); // Consommer le \
        const n = this.advance(); // Lire le caractère suivant
        if (n === 'n') s += '\n';  // \n → saut de ligne réel
        else if (n === 't') s += '\t'; // \t → tabulation réelle
        else s += n; // Tout autre caractère après \ → le garder tel quel
      } else s += this.advance();
    }
    // Si on atteint la fin du fichier sans trouver le " fermant → erreur
    if (this.pos >= this.source.length) this.err(this.grammar.errors.UNCLOSED_STRING);
    this.advance(); // Consommer le guillemet fermant "
    return { kind: 'STRING', value: s, line: ln, col: co };
  }


  // ── Lire un identifiant ou un mot-clé ────────────────────────────────────────
  // Un identifiant est un nom : une variable (x, score), une fonction (saluer).
  // Si le mot est dans kwMap, c'est un mot-clé (soit, si, fin…) → son kind change.
  rId(ln, co) {
    let s = '';
    // Lire tous les caractères alphanumériques consécutifs (lettres, chiffres, _)
    while (this.pos < this.source.length && this.isAN(this.peek())) s += this.advance();

    // Vérifier si le mot est un mot-clé connu. toLowerCase() pour être insensible à la casse.
    const kind = this.kwMap[s.toLowerCase()] || 'IDENT';
    // Si kwMap["soit"] = "LET" → kind = "LET"
    // Si le mot n'est pas un mot-clé → kind = "IDENT" (identifiant ordinaire)
    return { kind, value: s, line: ln, col: co };
  }


  // ── Lire un opérateur ou un symbole de ponctuation ───────────────────────────
  // Essaie d'abord les opérateurs à 2 caractères (==, !=, <=, >=, +=, etc.)
  // puis les opérateurs à 1 caractère (+, -, *, /, etc.)
  // Retourne null si aucun opérateur reconnu (le tokenizer déclenchera une erreur).
  rOp(ln, co) {
    const two = this.source.substr(this.pos, 2); // Les 2 prochains caractères
    const one = this.peek();                      // Le prochain caractère

    // Opérateurs de comparaison à 2 caractères → type OP
    if (['==', '!=', '<=', '>='].includes(two)) {
      this.advance(); this.advance();
      return { kind: 'OP', value: two, line: ln, col: co };
    }
    // Raccourcis d'affectation → type COMPOP (+=, -=, *=, /=)
    if (['+=', '-=', '*=', '/='].includes(two)) {
      this.advance(); this.advance();
      return { kind: 'COMPOP', value: two, line: ln, col: co };
    }

    // Flèche → (U+2192) utilisée dans les dictionnaires Spira
    if (one === '→') {
      this.advance();
      return { kind: 'ARROW', value: '→', line: ln, col: co };
    }

    // Ponctuation : virgule, crochets, accolades, deux-points
    if (one === ',') { this.advance(); return { kind: 'COMMA',    value: ',', line: ln, col: co }; }
    if (one === '[') { this.advance(); return { kind: 'LBRACKET', value: '[', line: ln, col: co }; }
    if (one === ']') { this.advance(); return { kind: 'RBRACKET', value: ']', line: ln, col: co }; }
    if (one === '{') { this.advance(); return { kind: 'LBRACE',   value: '{', line: ln, col: co }; }
    if (one === '}') { this.advance(); return { kind: 'RBRACE',   value: '}', line: ln, col: co }; }
    if (one === ':') { this.advance(); return { kind: 'COLON',    value: ':', line: ln, col: co }; }

    // Opérateurs arithmétiques et de comparaison simples
    if ('+-*/=<>()%'.includes(one)) {
      this.advance();
      return { kind: 'OP', value: one, line: ln, col: co };
    }
    return null; // Caractère non reconnu → le tokenize() déclenchera une erreur
  }
}

module.exports = { Tokenizer, SpiraError };
