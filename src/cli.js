#!/usr/bin/env node
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CLI (Interface en Ligne de Commande)
//
// Rôle : c'est le point d'entrée du compilateur Spira.
// Quand tu tapes "spira run fichier.sp", c'est ce fichier qui est exécuté.
//
// Il orchestre toutes les étapes de la compilation dans l'ordre :
//   1. Lire le fichier source .sp
//   2. Tokenizer → liste de tokens
//   3. Parser    → AST (arbre syntaxique)
//   4. Résolution des imports (inclure les fichiers "utiliser")
//   5. Checker   → vérification sémantique
//   6. CodeGen   → génération du JavaScript
//   7. Exécution du JavaScript avec Node.js
// ─────────────────────────────────────────────────────────────────────────────

// Modules Node.js standard (inclus dans Node, pas besoin de les installer)
const fs = require('fs');                    // Lecture/écriture de fichiers
const path = require('path');                // Manipulation de chemins de fichiers
const os   = require('os');                  // Informations système (répertoire temporaire)
const { spawnSync } = require('child_process'); // Exécuter une commande externe (node)

// Modules internes du compilateur Spira
const { GRAMMARS, detectLanguage } = require('./grammars');
const { Tokenizer, SpiraError }    = require('./tokenizer');
const { Parser }                   = require('./parser');
const { Checker }                  = require('./checker');
const { CodeGen }                  = require('./codegen');


// ── Codes de couleur ANSI pour le terminal ────────────────────────────────────
// \x1b[ est la séquence d'échappement ANSI que les terminaux reconnaissent.
// Ces codes permettent d'afficher du texte coloré ou stylé dans la console.
const C = {
  reset:     '\x1b[0m',  // Revenir au style normal
  bold:      '\x1b[1m',  // Texte en gras
  dim:       '\x1b[2m',  // Texte atténué
  red:       '\x1b[31m', // Texte rouge (erreurs)
  green:     '\x1b[32m', // Texte vert (succès)
  yellow:    '\x1b[33m', // Texte jaune (avertissements)
  cyan:      '\x1b[36m', // Texte cyan (info)
  white:     '\x1b[37m', // Texte blanc
  underline: '\x1b[4m'   // Texte souligné
};


// ── Afficher le logo au démarrage ─────────────────────────────────────────────
function logo() {
  console.log('\n' + C.yellow + C.bold + '  Spira' + C.reset +
    C.dim + '  v0.7 — Le langage de programmation universel' + C.reset + '\n');
}


// ── Afficher une erreur de façon lisible et contextualisée ───────────────────
// Paramètres :
//   err      : l'objet erreur (SpiraError ou Error JavaScript ordinaire)
//   filename : le chemin du fichier source (pour l'afficher dans le message)
//   source   : le contenu texte du fichier (pour afficher la ligne en contexte)
function printError(err, filename, source) {
  console.error('\n' + C.red + C.bold + '  ERREUR' + C.reset);

  if (err instanceof SpiraError) {
    // Afficher le message d'erreur Spira localisé
    console.error(C.red + '  ' + err.spiraMsg + C.reset);

    // Afficher la ligne du code source où se trouve l'erreur (avec un ^ en dessous)
    if (err.line && source) {
      const lines  = source.split('\n');
      const lineNo = err.line - 1; // Les tableaux sont indexés à 0, les lignes à 1
      if (lines[lineNo] !== undefined) {
        const lineContent = lines[lineNo];
        const col = err.col || 1;

        console.error('');
        // Afficher le numéro de ligne + le contenu de la ligne
        console.error(C.dim + '  ' + String(err.line).padStart(4) + ' │  ' + C.reset + lineContent);
        // Placer un "^" sous la colonne où se trouve l'erreur
        const arrow = ' '.repeat(7 + col - 1) + C.red + '^' + C.reset;
        console.error(arrow);
      }
      console.error(C.dim + '  Ligne ' + err.line +
        (err.col ? ', col ' + err.col : '') +
        ' — ' + path.basename(filename || '') + C.reset);
    }

    // Suggestions intelligentes selon le type d'erreur
    if (err.spiraMsg && err.spiraMsg.includes('UNDEFINED_VAR') || err.spiraMsg.includes('Variable non définie')) {
      console.error(C.yellow + '  Suggestion : as-tu déclaré cette variable avec "soit" ?' + C.reset);
    }
    if (err.spiraMsg && (err.spiraMsg.includes('UNEXPECTED_TOKEN') || err.spiraMsg.includes('Symbole inattendu'))) {
      console.error(C.yellow + '  Suggestion : as-tu oublié un "fin", un "alors", ou une parenthèse ?' + C.reset);
    }
  } else {
    // Erreur JavaScript ordinaire (ex: fichier introuvable)
    console.error(C.red + '  ' + err.message + C.reset);
  }
  console.error('');
}


// ── Résoudre les imports récursivement ───────────────────────────────────────
// "utiliser 'maths.sp'" inclut le contenu de maths.sp dans le programme.
// Cette fonction parcourt l'AST, et quand elle trouve un IMPORT, elle charge
// le fichier importé, le compile en AST, et injecte ses fonctions à la place.
//
// Paramètres :
//   ast      : l'AST du fichier courant
//   filename : chemin du fichier courant (pour résoudre les chemins relatifs)
//   visited  : Set des fichiers déjà importés (évite les imports circulaires infinis)
function resolveImports(ast, filename, visited) {
  visited = visited || new Set(); // Initialisation du Set au premier appel
  const dir  = path.dirname(path.resolve(filename)); // Répertoire du fichier courant
  const body = []; // Nouveau corps de l'AST avec les imports remplacés

  for (const node of ast.body) {
    if (node.type === 'IMPORT') {
      const importPath = path.resolve(dir, node.path); // Chemin absolu du fichier importé
      if (!visited.has(importPath)) {
        visited.add(importPath); // Marquer comme visité pour éviter les boucles
        const src = fs.readFileSync(importPath, 'utf8');
        const lc  = detectLanguage(importPath, src);
        const g   = GRAMMARS[lc];
        // Compiler le fichier importé en AST (tokenizer + parser)
        const tokens      = new Tokenizer(src, g).tokenize();
        const importedAst = new Parser(tokens, g).parse();
        // Résoudre récursivement ses propres imports
        const resolved = resolveImports(importedAst, importPath, visited);
        // N'injecter que les TRANSFORMATIONS (fonctions) du fichier importé.
        // On ignore le code "principal" du module importé (afficher, etc.).
        body.push(...resolved.body.filter(n => n.type === 'TRANSFORMATION'));
        // L'opérateur spread "..." déploie les éléments du tableau dans l'appel push().
      }
    } else {
      body.push(node); // Garder les nœuds non-IMPORT tels quels
    }
  }
  return { ...ast, body }; // Retourner un nouvel AST avec le body mis à jour
  // "{ ...ast, body }" est une copie de l'objet ast où "body" est remplacé.
}


// ── Pipeline de compilation : regrouper toutes les étapes ────────────────────
// Paramètres :
//   filename : chemin vers le fichier .sp à compiler
//   opts     : options optionnelles ({ lang: 'fr' } pour forcer la langue)
// Retourne : { ast, grammar, source }
// Lève une exception (SpiraError) si une erreur est détectée.
function compile(filename, opts) {
  opts = opts || {};
  const source   = fs.readFileSync(filename, 'utf8'); // Lire le fichier source
  const langCode = opts.lang || detectLanguage(filename, source);
  const grammar  = GRAMMARS[langCode];
  if (!grammar) throw new Error('Langue inconnue: "' + langCode + '"');

  try {
    // Étape 1 : Tokenisation
    const tokens = new Tokenizer(source, grammar).tokenize();
    // Étape 2 : Parsing → AST brut
    const rawAst = new Parser(tokens, grammar).parse();
    // Étape 3 : Résolution des imports
    const ast    = resolveImports(rawAst, filename);
    // Étape 4 : Vérification sémantique + affichage des avertissements
    new Checker(grammar).check(ast).forEach(w => console.warn(C.yellow + '  ⚠ ' + w + C.reset));
    return { ast, grammar, source };
  } catch (e) {
    // Enrichir l'erreur avec le code source (pour afficher le contexte dans printError)
    if (e instanceof SpiraError) e.source = e.source || source;
    throw e; // Re-lancer l'erreur pour qu'elle remonte jusqu'à la commande CLI
  }
}


// ─── Commandes CLI ────────────────────────────────────────────────────────────

// ── spira run <fichier.sp> : compiler et exécuter directement ────────────────
function cmdRun(args) {
  const f = args[0];
  if (!f) { console.error(C.red + '  Usage: spira run <fichier.sp>' + C.reset); process.exit(1); }

  console.log(C.dim + '  Compilation de ' + C.reset + C.bold + path.basename(f) + C.reset + C.dim + '...' + C.reset);

  let result;
  try {
    result = compile(f);
  } catch (e) {
    const src = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    printError(e, f, src);
    process.exit(1); // Quitter avec un code d'erreur (code ≠ 0 = échec)
  }

  const { ast, grammar } = result;

  // Étape 5 : Génération du JavaScript
  const js = new CodeGen(grammar).generate(ast);

  // Écrire le JavaScript dans un fichier temporaire
  // os.tmpdir() retourne le répertoire système pour les fichiers temporaires
  const tmp = path.join(os.tmpdir(), 'spira_' + Date.now() + '.js');
  fs.writeFileSync(tmp, js, 'utf8');

  console.log(C.green + '  ✓ Compilé.' + C.reset + '\n' + C.dim + '  ' + '─'.repeat(40) + C.reset);

  // Étape 6 : Exécuter le JavaScript avec Node.js
  // spawnSync est "synchrone" : il attend la fin du processus avant de continuer.
  // { stdio: 'inherit' } : le processus fils partage l'entrée/sortie du processus parent
  //   → ce que Node affiche apparaît directement dans notre terminal.
  spawnSync('node', [tmp], { stdio: 'inherit' });

  // Nettoyer le fichier temporaire
  try { fs.unlinkSync(tmp); } catch (e) {}
  console.log(C.dim + '  ' + '─'.repeat(40) + C.reset + '\n');
}


// ── spira tester <fichier.sp> : exécuter les tests intégrés ──────────────────
// Les tests sont définis dans le programme avec "tester...fin" et sont
// exécutés comme partie intégrante du programme : cmdRun suffit.
function cmdTest(args) {
  const f = args[0];
  if (!f) { console.error(C.red + '  Usage: spira tester <fichier.sp>' + C.reset); process.exit(1); }
  cmdRun(args); // Les blocs "tester" sont compilés inline dans le programme
}


// ── spira compile <fichier.sp> [-o out.js] : compiler vers un fichier .js ────
// Permet de sauvegarder le JavaScript généré pour l'inspecter ou le distribuer.
function cmdCompile(args) {
  const f = args[0];
  if (!f) { console.error(C.red + '  Usage: spira compile <fichier.sp> [-o out.js]' + C.reset); process.exit(1); }

  // Chercher l'option "-o" pour un nom de sortie personnalisé
  const oi  = args.indexOf('-o'); // indexOf retourne -1 si non trouvé
  const out = oi !== -1
    ? args[oi + 1]                           // Utiliser le nom fourni après -o
    : f.replace(/\.sp$/, '.js').replace(/\.spira\.\w+$/, '.js'); // Remplacer l'extension

  let result;
  try {
    result = compile(f);
  } catch (e) {
    const src = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    printError(e, f, src);
    process.exit(1);
  }

  const { ast, grammar } = result;
  // Créer les répertoires intermédiaires si nécessaire (recursive: true)
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, new CodeGen(grammar).generate(ast), 'utf8');
  console.log(C.green + '  ✓ Compilé vers ' + C.bold + out + C.reset + '\n');
}


// ── spira ast <fichier.sp> : afficher l'arbre syntaxique ─────────────────────
// Utile pour déboguer ou comprendre comment Spira analyse un programme.
function cmdAst(args) {
  const f = args[0];
  if (!f) { console.error(C.red + '  Usage: spira ast <fichier.sp>' + C.reset); process.exit(1); }
  let result;
  try { result = compile(f); } catch (e) {
    const src = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    printError(e, f, src); process.exit(1);
  }
  console.log('\n' + C.yellow + '  Noyau sémantique' + C.reset + '\n' + C.dim + '  ' + '─'.repeat(40) + C.reset);
  // JSON.stringify(obj, null, 2) : afficher l'objet avec une indentation de 2 espaces
  JSON.stringify(result.ast, null, 2).split('\n').forEach(l => console.log('  ' + l));
  console.log(C.dim + '  ' + '─'.repeat(40) + C.reset + '\n');
}


// ── spira help : afficher l'aide ──────────────────────────────────────────────
function cmdHelp() {
  const cmds = [
    ['run <f>',               'Compiler et exécuter'],
    ['compile <f> [-o out]',  'Compiler vers JavaScript'],
    ['ast <f>',               'Afficher le Noyau sémantique'],
    ['help',                  'Afficher cette aide'],
  ];
  console.log(C.bold + '  COMMANDES' + C.reset + '\n');
  // padEnd(28) : compléter avec des espaces jusqu'à 28 caractères (pour l'alignement)
  cmds.forEach(([c, d]) => console.log('  ' + C.yellow + 'spira ' + c.padEnd(28) + C.reset + C.dim + d + C.reset));

  console.log('\n' + C.bold + '  NOUVEAUTÉS v0.7' + C.reset);
  const news = [
    ['pour chaque x dans liste répéter', 'boucle sur une liste'],
    ['score += 10',                       'raccourcis += -= *= /='],
    ['longueur / majuscules / minuscules','fonctions texte'],
    ['contient / découper',              'fonctions texte avancées'],
    ['{ "clé": valeur }',               'dictionnaires'],
    ['tester "label" ... fin',           'tests intégrés'],
    ['vérifier que expr',               'assertion'],
  ];
  news.forEach(([s, d]) => console.log('  ' + C.cyan + s.padEnd(38) + C.reset + C.dim + d + C.reset));
  console.log('');
}


// ─── Point d'entrée principal ────────────────────────────────────────────────
// process.argv contient les arguments de la ligne de commande.
// Exemple : "spira run hello.sp" → process.argv = ['node', 'cli.js', 'run', 'hello.sp']
// La destructuration [,, cmd, ...args] ignore les 2 premiers éléments (node et cli.js).
const [,, cmd, ...args] = process.argv;

logo(); // Toujours afficher le logo

try {
  // Dispatcher selon la commande fournie
  switch (cmd) {
    case 'run':     cmdRun(args);     break;
    case 'compile': cmdCompile(args); break;
    case 'ast':     cmdAst(args);     break;
    case 'tester':  cmdTest(args);    break;
    case 'help': case '--help': case undefined: cmdHelp(); break; // Pas de commande → aide
    default:
      console.error(C.red + '  Commande inconnue: "' + cmd + '"' + C.reset);
      process.exit(1);
  }
} catch (e) {
  // Capturer les erreurs non gérées (ex: fichier introuvable)
  printError(e, args[0]);
  process.exit(1);
}
