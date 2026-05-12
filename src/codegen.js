'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CODEGEN (Générateur de code)
//
// Rôle : prendre l'AST validé par le Checker et le transformer en code
// JavaScript exécutable par Node.js.
//
// C'est la dernière étape du compilateur. Le résultat est une chaîne de texte
// contenant du JavaScript, que le CLI écrit dans un fichier temporaire
// puis exécute avec "node".
//
// Stratégie : parcourir l'AST nœud par nœud (récursivement) et pour chaque
// nœud, produire le fragment de code JavaScript correspondant.
//
// Deux méthodes principales :
//   gS(node) → génère une INSTRUCTION (statement) : retourne une ligne JS
//   gE(node) → génère une EXPRESSION (valeur)     : retourne une sous-expression JS
// ─────────────────────────────────────────────────────────────────────────────

class CodeGen {
  // Paramètre :
  //   grammar : la grammaire active, utilisée pour les noms des builtins
  //             et pour afficher "vrai"/"faux"/"Rien" dans la bonne langue
  constructor(grammar) {
    this.grammar = grammar;
    this.indent  = 0; // Niveau d'indentation courant (augmente dans les blocs)

    // Récupérer les noms des fonctions intégrées dans la langue active.
    // Le "|| 'fallback'" est une sécurité si la grammaire ne définit pas la builtin.
    const b = grammar.builtins || {};
    this.sizeBuiltin     = b.SIZE     || 'taille';
    this.askBuiltin      = b.ASK      || 'demander';
    this.numBuiltin      = b.NUM      || 'nombre';
    this.txtBuiltin      = b.TXT      || 'texte';
    this.lenBuiltin      = b.LEN      || 'longueur';
    this.upperBuiltin    = b.UPPER    || 'majuscules';
    this.lowerBuiltin    = b.LOWER    || 'minuscules';
    this.containsBuiltin = b.CONTAINS || 'contient';
    this.splitBuiltin    = b.SPLIT    || 'découper';
    this.hasTests        = false; // Sera mis à vrai si le programme contient des "tester"
  }

  // ── Produire l'indentation courante (espaces) ─────────────────────────────
  // Retourne une chaîne de 2 espaces répétés "this.indent" fois.
  // Exemple : si indent = 2 → "    " (4 espaces)
  ind() { return '  '.repeat(this.indent); }


  // ── Générer l'intégralité du programme JavaScript ─────────────────────────
  // Paramètre : ast, l'arbre syntaxique complet du programme Spira
  // Retourne  : une chaîne de texte contenant du JavaScript valide
  generate(ast) {
    // Détecter si le programme contient des blocs "tester" pour conditionner le footer
    this.hasTests = ast.body.some(n => n.type === 'TEST');
    // Array.some() retourne vrai si AU MOINS UN élément satisfait la condition.

    // Récupérer les mots pour vrai, faux et rien dans la langue active
    const T = this.grammar.keywords.TRUE;    // "vrai" en français
    const F = this.grammar.keywords.FALSE;   // "faux" en français
    const N = this.grammar.keywords.NOTHING; // "Rien" en français

    // ── Le "runtime" : fonctions JavaScript injectées en tête de tout programme Spira
    // Ces fonctions sont le "support" du langage, disponibles à l'exécution.
    const runtime = [
      '// Runtime Spira v0.7',

      // _afficher : version de console.log qui respecte les valeurs Spira
      // (affiche "vrai"/"faux"/"Rien" au lieu de true/false/null)
      'const _fs = require("fs");',
      'function _afficher(val) {',
      '  if (val === true)  { process.stdout.write("' + T + '\\n"); return; }',
      '  if (val === false) { process.stdout.write("' + F + '\\n"); return; }',
      '  if (val === null || val === undefined) { process.stdout.write("' + N + '\\n"); return; }',
      '  process.stdout.write(String(val) + "\\n");',
      '}',

      // _str : convertir une valeur en texte Spira (pour la concaténation)
      'function _str(v) {',
      '  if (v === true)  return "' + T + '";',
      '  if (v === false) return "' + F + '";',
      '  if (v === null || v === undefined) return "' + N + '";',
      '  return String(v);',
      '}',

      // _add : l'opérateur + en Spira : additionne des nombres OU concatène du texte
      'function _add(a, b) { return (typeof a === "number" && typeof b === "number") ? a + b : _str(a) + _str(b); }',

      // _demander : lire une saisie clavier de façon synchrone (bloquante)
      // Node.js n'a pas de readline synchrone natif, d'où cette lecture manuelle du buffer
      'function _demander(q) {',
      '  process.stdout.write(String(q));',
      '  const buf = Buffer.alloc(4096); let pos = 0;',
      '  try { while (true) { const n = _fs.readSync(0, buf, pos, 1, null); if (n === 0) break; if (buf[pos] === 10) break; if (buf[pos] !== 13) pos++; } } catch(e) {}',
      '  return buf.slice(0, pos).toString("utf8");',
      '}',
    ].join('\n');

    // ── En-tête du moteur de tests (injecté seulement si des "tester" existent)
    const testHeader = this.hasTests ? [
      '',
      '// Moteur de tests Spira',
      'let _t_pass = 0, _t_fail = 0, _t_total = 0;', // Compteurs globaux
    ].join('\n') : '';

    // ── Pied de page des tests : affiche le bilan à la fin du programme
    const testFooter = this.hasTests ? [
      '',
      '// Résumé des tests',
      'process.stdout.write("\\n─────────────────────────────\\n");',
      'process.stdout.write("Tests : " + _t_total + " │ ✓ " + _t_pass + " │ ✗ " + _t_fail + "\\n");',
      'if (_t_fail === 0) process.stdout.write("Tous les tests sont passés.\\n");',
      'else process.stdout.write(_t_fail + " test(s) ont échoué.\\n");',
    ].join('\n') : '';

    // Assembler toutes les parties : runtime + header tests + code du programme + footer tests
    const lines = ['// Généré par Spira v0.7 — ' + this.grammar.name, '', runtime, testHeader, '// Programme'];
    for (const s of ast.body) lines.push(this.gS(s)); // Générer chaque instruction
    lines.push(testFooter);
    return lines.join('\n'); // Joindre toutes les lignes en une seule chaîne
  }


  // ── Générer une instruction JavaScript à partir d'un nœud AST ──────────────
  // Paramètre : node, un nœud de l'AST de type "instruction"
  // Retourne  : une chaîne de texte contenant l'instruction JavaScript
  gS(node) {
    const i = this.ind(); // Indentation courante
    switch (node.type) {

      case 'IMPORT':
        // Les imports sont déjà résolus dans le CLI : on ne génère qu'un commentaire
        return i + '// import résolu: ' + node.path;

      case 'TRANSFORMATION': {
        // Générer une fonction JavaScript : function nom(p1, p2) { ... }
        const p = node.params.join(', '); // Paramètres séparés par des virgules
        let o = 'function ' + node.name + '(' + p + ') {\n';
        this.indent++; // Entrer dans le corps de la fonction → augmenter l'indentation
        for (const s of node.body) o += this.gS(s) + '\n'; // Générer chaque instruction du corps
        this.indent--; // Sortir du corps → restaurer l'indentation
        return o + '}';
      }

      case 'RETOUR':
        // "donner expr" → "return expr;"
        return i + 'return ' + this.gE(node.value) + ';';

      case 'APPEL':
        // Appel de fonction comme instruction : nom(args);
        return i + this.gE(node) + ';'; // gE génère l'expression d'appel

      case 'AJOUTER':
        // "ajouter elem à liste" → "liste.push(elem);"
        return i + node.list + '.push(' + this.gE(node.element) + ');';

      case 'LIEN_LISTE':
        // "liste[index] = valeur" → même chose en JavaScript
        return i + node.name + '[' + this.gE(node.index) + '] = ' + this.gE(node.value) + ';';

      case 'LIEN':
        // Déclaration (mutation: false) → "let nom = valeur;"
        // Réassignation (mutation: true) → "nom = valeur;"
        return node.mutation
          ? i + node.name + ' = ' + this.gE(node.value) + ';'
          : i + 'let ' + node.name + ' = ' + this.gE(node.value) + ';';

      case 'CONDITION': {
        // "si test alors ... [sinon ...] fin" → "if (test) { ... } [else { ... }]"
        let o = i + 'if (' + this.gE(node.test) + ') {\n';
        this.indent++;
        for (const s of node.consequent) o += this.gS(s) + '\n';
        this.indent--;
        o += i + '}';
        if (node.alternate && node.alternate.length > 0) {
          o += ' else {\n';
          this.indent++;
          for (const s of node.alternate) o += this.gS(s) + '\n';
          this.indent--;
          o += i + '}';
        }
        return o;
      }

      case 'REPETITION': {
        // "tantque test répéter ... fin" → "while (test) { ... }"
        let o = i + 'while (' + this.gE(node.test) + ') {\n';
        this.indent++;
        for (const s of node.body) o += this.gS(s) + '\n';
        this.indent--;
        return o + i + '}';
      }

      case 'POUR_CHAQUE': {
        // "pour chaque elem dans liste répéter" → "for (const elem of liste) { ... }"
        let o = i + 'for (const ' + node.elem + ' of ' + node.list + ') {\n';
        this.indent++;
        for (const s of node.body) o += this.gS(s) + '\n';
        this.indent--;
        return o + i + '}';
      }

      case 'TEST': {
        // Chaque "tester" devient une IIFE (Immediately Invoked Function Expression) :
        // une fonction anonyme appelée immédiatement, entourée d'un try/catch.
        // Cela permet d'isoler les erreurs de chaque test sans arrêter le programme.
        // Syntaxe IIFE en JS : (() => { ... })();
        const label = JSON.stringify(node.label); // Sécuriser le label pour l'inclure dans du JS
        let o = i + '// Test : ' + node.label + '\n';
        o += i + '_t_total++;\n';       // Incrémenter le compteur total de tests
        o += i + '(() => {\n';          // Début de l'IIFE
        this.indent++;
        o += i + 'try {\n';
        this.indent++;
        for (const s of node.body) o += this.gS(s) + '\n'; // Corps du test
        this.indent--;
        o += i + '  _t_pass++;\n';      // Si pas d'exception → test réussi
        o += i + '  process.stdout.write("  ✓ " + ' + label + ' + "\\n");\n';
        o += i + '} catch(e) {\n';
        o += i + '  _t_fail++;\n';      // Si exception → test échoué
        o += i + '  process.stdout.write("  ✗ " + ' + label + ' + ": " + e.message + "\\n");\n';
        o += i + '}\n';
        this.indent--;
        return o + i + '})();';         // Fin et appel immédiat de l'IIFE
      }

      case 'ASSERTION': {
        // "vérifier que condition" → lance une erreur si la condition est fausse
        // On évalue l'expression deux fois : une pour le test, une pour le message d'erreur.
        return i + 'if (!(' + this.gE(node.condition) + ')) { throw new Error("' +
          this.grammar.errors.ASSERTION_FAILED + ' : " + JSON.stringify(' + this.gE(node.condition) + ')); }';
      }

      case 'EFFET':
        // "afficher expr" → "_afficher(expr);"
        return node.action === 'PRINT'
          ? i + '_afficher(' + this.gE(node.value) + ');'
          : i + '// ' + node.action;

      default:
        return i + '// nœud: ' + node.type; // Nœud inconnu → commentaire (ne devrait pas arriver)
    }
  }


  // ── Générer une expression JavaScript à partir d'un nœud AST ──────────────
  // Paramètre : node, un nœud de l'AST de type "expression"
  // Retourne  : une chaîne de texte (pas de ";" à la fin, car c'est une sous-expression)
  gE(node) {
    switch (node.type) {

      case 'VALEUR':
        // Valeur littérale : chaîne → JSON.stringify pour les guillemets et l'échappement
        // Nombre ou booléen → conversion en texte simple
        return node.valueType === 'string' ? JSON.stringify(node.value) : String(node.value);

      case 'REFERENCE':
        // Référence à une variable : juste son nom en JavaScript
        return node.name;

      case 'LISTE':
        // Liste littérale : [elem1, elem2, ...]
        // map() applique gE() à chaque élément et retourne un nouveau tableau de chaînes.
        // join(', ') assemble ce tableau avec des virgules.
        return '[' + node.elements.map(e => this.gE(e)).join(', ') + ']';

      case 'DICT':
        // Dictionnaire : { "clé1": val1, "clé2": val2 }
        return '{' + node.pairs.map(p => this.gE(p.key) + ': ' + this.gE(p.value)).join(', ') + '}';

      case 'ACCES':
        // Accès par index : liste[index]
        return node.list + '[' + this.gE(node.index) + ']';

      case 'APPEL': {
        const n = node.name;
        // Fonctions intégrées : traduire en leur équivalent JavaScript natif
        if (n === this.sizeBuiltin)     return this.gE(node.args[0]) + '.length';           // taille(l) → l.length
        if (n === this.askBuiltin)      return '_demander(' + this.gE(node.args[0]) + ')';   // demander(q) → _demander(q)
        if (n === this.numBuiltin)      return 'parseFloat(' + this.gE(node.args[0]) + ')';  // nombre(x) → parseFloat(x)
        if (n === this.txtBuiltin)      return '_str(' + this.gE(node.args[0]) + ')';        // texte(x) → _str(x)
        if (n === this.lenBuiltin)      return '(' + this.gE(node.args[0]) + ').length';     // longueur(s) → s.length
        if (n === this.upperBuiltin)    return '(' + this.gE(node.args[0]) + ').toUpperCase()'; // majuscules(s)
        if (n === this.lowerBuiltin)    return '(' + this.gE(node.args[0]) + ').toLowerCase()'; // minuscules(s)
        if (n === this.containsBuiltin) return '(' + this.gE(node.args[0]) + ').includes(' + this.gE(node.args[1]) + ')'; // contient(l, x)
        if (n === this.splitBuiltin)    return '(' + this.gE(node.args[0]) + ').split(' + this.gE(node.args[1]) + ')';    // découper(s, sep)
        // Fonction utilisateur : appel JavaScript direct nom(arg1, arg2, ...)
        return n + '(' + node.args.map(a => this.gE(a)).join(', ') + ')';
      }

      case 'UNARY':
        // Opérateur unaire :
        //   non x → !(x)
        //   -x    → -(x)
        return node.op === 'NOT' ? '!(' + this.gE(node.operand) + ')' : '-(' + this.gE(node.operand) + ')';

      case 'BINARY': {
        const L = this.gE(node.left), R = this.gE(node.right);
        if (node.op === 'AND') return '(' + L + ' && ' + R + ')'; // et → &&
        if (node.op === 'OR')  return '(' + L + ' || ' + R + ')'; // ou → ||
        // L'opérateur + passe par _add() pour gérer la concaténation texte + nombre
        if (node.op === '+')   return '_add(' + L + ', ' + R + ')';
        // Division entière : Spira utilise Math.trunc pour ne pas avoir de décimales
        if (node.op === '/')   return 'Math.trunc(' + L + ' / ' + R + ')';
        if (node.op === '%')   return '(' + L + ' % ' + R + ')';
        // Autres opérateurs (*, -, ==, !=, <, >, <=, >=) : traduction directe
        return '(' + L + ' ' + node.op + ' ' + R + ')';
      }

      default: return '/* ' + node.type + ' */'; // Expression inconnue → commentaire JS
    }
  }
}

module.exports = { CodeGen };
