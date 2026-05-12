'use strict';
const { SpiraError } = require('./tokenizer');

// ─────────────────────────────────────────────────────────────────────────────
// PARSER (Analyseur syntaxique)
//
// Rôle : prendre la liste de tokens produite par le Tokenizer et la transformer
// en un AST (Abstract Syntax Tree = Arbre Syntaxique Abstrait).
//
// Un AST est une représentation en arbre de la structure du programme.
// Exemple : "soit x = 2 + 3" devient l'arbre :
//   LIEN
//   ├── name: "x"
//   └── value: BINARY
//               ├── op: "+"
//               ├── left:  VALEUR 2
//               └── right: VALEUR 3
//
// Le Parser utilise la technique de la "descente récursive" :
// une fonction par niveau de priorité arithmétique (or → and → comparaison → addition → multiplication → unaire → primaire).
// La priorité la PLUS FAIBLE est en haut (parseOr), la PLUS FORTE en bas (parsePrimary).
// ─────────────────────────────────────────────────────────────────────────────

class Parser {
  // Paramètres :
  //   tokens  : tableau de tokens produit par Tokenizer.tokenize()
  //   grammar : la grammaire active (pour les messages d'erreur)
  constructor(tokens, grammar) {
    this.tokens  = tokens;
    this.grammar = grammar;
    this.pos     = 0; // Index du token courant dans le tableau
  }

  // ── Déclencher une erreur de syntaxe à la position courante
  err(msg) {
    const t = this.peek();
    throw new SpiraError(msg, t.line, t.col, this.grammar);
  }

  // ── Regarder le token à la position actuelle (+ un décalage optionnel)
  // Ne consomme PAS le token (lecture non-destructive).
  peek(o)   { return this.tokens[Math.min(this.pos + (o || 0), this.tokens.length - 1)]; }

  // ── Consommer et retourner le token courant, puis avancer
  advance() { return this.tokens[this.pos++]; }

  // ── Consommer le token courant SI son kind est dans la liste fournie
  // Retourne le token consommé, ou null si aucun ne correspond.
  // Exemple : this.match('ELSE') → consomme le token "sinon" s'il est là
  match(...kinds) { return kinds.includes(this.peek().kind) ? this.advance() : null; }

  // ── Consommer un token d'un kind précis, ou déclencher une erreur
  // C'est la "vérification obligatoire" : on s'attend à voir exactement ce token.
  expect(kind, msg) {
    if (this.peek().kind === kind) return this.advance();
    this.err(msg || this.grammar.errors.EXPECTED + ' "' + kind + '", obtenu "' + this.peek().value + '"');
  }

  // ── Comme expect(), mais pour un opérateur d'une valeur précise
  expectOp(op) {
    const t = this.peek();
    if (t.kind === 'OP' && t.value === op) return this.advance();
    this.err(this.grammar.errors.EXPECTED + ' "' + op + '", obtenu "' + t.value + '"');
  }


  // ── Point d'entrée : analyser tout le programme ──────────────────────────────
  // Lit les instructions une par une jusqu'au token EOF (fin de fichier).
  // Retourne un nœud PROGRAM qui contient toutes les instructions dans "body".
  parse() {
    const body = [];
    while (this.peek().kind !== 'EOF') body.push(this.parseStmt());
    return { type: 'PROGRAM', body, meta: { language: this.grammar.name } };
  }

  // ── Analyser un bloc d'instructions jusqu'à un token "stop" ─────────────────
  // Utilisé pour le corps des fonctions, des conditions, des boucles, etc.
  // "stop" est un tableau de kinds qui marquent la fin du bloc (ex: ['END', 'ELSE']).
  parseBlock(stop) {
    const s = [];
    while (!stop.includes(this.peek().kind) && this.peek().kind !== 'EOF') s.push(this.parseStmt());
    return s;
  }


  // ── Analyser une instruction (statement) ─────────────────────────────────────
  // Une instruction est une action complète : déclaration, appel, condition, boucle...
  // Cette fonction regarde le premier token pour décider quelle instruction c'est.
  parseStmt() {
    const tok = this.peek();

    // ── IMPORT : utiliser "fichier.sp"
    // Permet d'inclure un autre fichier Spira dans le programme.
    if (tok.kind === 'IMPORT') {
      this.advance();
      const p = this.expect('STRING'); // Le chemin du fichier est une chaîne
      return { type: 'IMPORT', path: p.value, line: tok.line };
    }

    // ── TRANSFORMATION (fonction) : faire nom [avec p1, p2, ...]
    // "faire" démarre la définition d'une fonction.
    // Une fonction est un bloc de code réutilisable qu'on peut appeler par son nom.
    // "avec" introduit la liste des paramètres (les données que la fonction reçoit).
    if (tok.kind === 'MAKE') {
      this.advance();
      const name   = this.expect('IDENT');    // Le nom de la fonction
      const params = [];                       // La liste des noms de paramètres
      if (this.match('WITH')) {
        // Il y a des paramètres : on en lit autant que la virgule le permet
        params.push(this.expect('IDENT').value);
        while (this.peek().kind === 'COMMA') {
          this.advance(); // Consommer la virgule
          params.push(this.expect('IDENT').value);
        }
      }
      const body = this.parseBlock(['END']); // Le corps de la fonction jusqu'à "fin"
      this.expect('END');
      return { type: 'TRANSFORMATION', name: name.value, params, body, line: tok.line };
    }

    // ── RETOUR : donner <expr>
    // "donner" est le mot-clé pour retourner une valeur depuis une fonction.
    // La valeur retournée est celle que l'appelant reçoit quand il appelle la fonction.
    if (tok.kind === 'GIVE') {
      this.advance();
      return { type: 'RETOUR', value: this.parseExpr(), line: tok.line };
      // parseExpr() analyse l'expression après "donner" (peut être n'importe quelle valeur)
    }

    // ── POUR CHAQUE : pour chaque elem dans liste répéter ... fin
    // Boucle qui parcourt chaque élément d'une liste.
    if (tok.kind === 'FOREACH') {
      this.advance();
      this.expect('EACH');          // Le mot "chaque"
      const elem = this.expect('IDENT'); // La variable qui recevra chaque élément
      this.expect('IN');            // Le mot "dans"
      const list = this.expect('IDENT'); // Le nom de la liste à parcourir
      this.expect('DO');            // "répéter"
      const body = this.parseBlock(['END']);
      this.expect('END');
      return { type: 'POUR_CHAQUE', elem: elem.value, list: list.value, body, line: tok.line };
    }

    // ── TESTER : tester "label" ... fin
    // Définit un test unitaire avec un nom descriptif.
    if (tok.kind === 'TEST') {
      this.advance();
      const label = this.expect('STRING'); // Le nom du test (pour l'affichage du résultat)
      const body  = this.parseBlock(['END']);
      this.expect('END');
      return { type: 'TEST', label: label.value, body, line: tok.line };
    }

    // ── VÉRIFIER : vérifier que <expr>
    // Assertion : si l'expression est fausse, le test échoue avec une erreur.
    if (tok.kind === 'ASSERT') {
      this.advance();
      this.expect('THAT'); // Le mot "que"
      const condition = this.parseExpr();
      return { type: 'ASSERTION', condition, line: tok.line };
    }

    // ── AJOUTER : ajouter <expr> à <liste>
    // Ajoute un élément à la fin d'une liste.
    if (tok.kind === 'ADD_TO') {
      this.advance();
      const element = this.parseExpr(); // L'élément à ajouter
      this.expect('TO');                // Le mot "à"
      const list = this.expect('IDENT');// Le nom de la liste
      return { type: 'AJOUTER', element, list: list.value, line: tok.line };
    }

    // ── LIEN (déclaration) : soit nom = valeur
    // Crée une nouvelle variable. mutation: false = c'est une déclaration.
    if (tok.kind === 'LET') {
      this.advance();
      const name = this.expect('IDENT'); // Le nom de la variable
      this.expectOp('=');
      return { type: 'LIEN', name: name.value, value: this.parseExpr(), mutation: false, line: tok.line };
    }

    // ── CONDITION : si ... alors ... [sinon ...] fin
    if (tok.kind === 'IF') {
      this.advance();
      const test       = this.parseExpr();              // La condition à évaluer
      this.expect('THEN');                              // "alors"
      const consequent = this.parseBlock(['ELSE', 'END']); // Corps si la condition est vraie
      let alternate    = null;
      if (this.match('ELSE')) alternate = this.parseBlock(['END']); // Corps si fausse (optionnel)
      this.expect('END');
      return { type: 'CONDITION', test, consequent, alternate, line: tok.line };
    }

    // ── RÉPÉTITION : tantque <condition> répéter ... fin
    // Boucle qui s'exécute tant que la condition est vraie.
    if (tok.kind === 'WHILE') {
      this.advance();
      const test = this.parseExpr(); // La condition de poursuite
      this.expect('DO');             // "répéter"
      const body = this.parseBlock(['END']);
      this.expect('END');
      return { type: 'REPETITION', test, body, line: tok.line };
    }

    // ── EFFET (affichage) : afficher <expr>
    // Affiche une valeur dans la console.
    if (tok.kind === 'PRINT') {
      this.advance();
      return { type: 'EFFET', action: 'PRINT', value: this.parseExpr(), line: tok.line };
    }

    // ── APPEL de fonction comme instruction : nom(arg1, arg2)
    // Reconnu par : IDENT suivi immédiatement de "("
    if (tok.kind === 'IDENT' && this.peek(1).kind === 'OP' && this.peek(1).value === '(') {
      return this.parseCall();
    }

    // ── RACCOURCIS D'AFFECTATION : nom += expr, nom -= expr, etc.
    // Équivalent à : nom = nom + expr (on l'exprime comme un LIEN mutation)
    if (tok.kind === 'IDENT' && this.peek(1).kind === 'COMPOP') {
      const name = this.advance();
      const op   = this.advance().value;    // +=, -=, *=, /=
      const rhs  = this.parseExpr();
      const baseOp = op[0];                 // On extrait l'opérateur de base : +, -, *, /
      // On crée un nœud BINARY qui représente "nom <op> expr"
      const value = { type: 'BINARY', op: baseOp, left: { type: 'REFERENCE', name: name.value }, right: rhs };
      return { type: 'LIEN', name: name.value, value, mutation: true, line: tok.line };
    }

    // ── LIEN_LISTE : nom[index] = valeur
    // Modifier un élément d'une liste à un indice précis.
    if (tok.kind === 'IDENT' && this.peek(1).kind === 'LBRACKET') {
      const name = this.advance();
      this.advance(); // Consommer "["
      const index = this.parseExpr(); // L'index (position) dans la liste
      this.expect('RBRACKET');
      this.expectOp('=');
      const value = this.parseExpr();
      return { type: 'LIEN_LISTE', name: name.value, index, value, line: tok.line };
    }

    // ── LIEN mutation : nom = valeur (réassignation d'une variable existante)
    // Différent de "soit nom = valeur" : ici la variable doit déjà exister.
    if (tok.kind === 'IDENT' && this.peek(1).kind === 'OP' && this.peek(1).value === '=') {
      const name = this.advance(); this.advance(); // Consommer le nom et le "="
      return { type: 'LIEN', name: name.value, value: this.parseExpr(), mutation: true, line: tok.line };
    }

    this.err(this.grammar.errors.UNEXPECTED_TOKEN + ': "' + tok.value + '"');
  }


  // ── Analyser un appel de fonction : nom(arg1, arg2, ...) ─────────────────────
  // Utilisé aussi bien comme instruction que comme expression (valeur dans une expr).
  // Exemple : saluer("Luther") ou additionner(2, 3)
  parseCall() {
    const name = this.advance();   // Le nom de la fonction
    this.advance();                // Consommer "("
    const args = [];
    if (!(this.peek().kind === 'OP' && this.peek().value === ')')) {
      // Il y a au moins un argument → lire le premier
      args.push(this.parseExpr());
      // Puis lire les suivants séparés par des virgules
      while (this.peek().kind === 'COMMA') { this.advance(); args.push(this.parseExpr()); }
    }
    this.expectOp(')'); // Fermer la parenthèse
    return { type: 'APPEL', name: name.value, args, line: name.line };
  }


  // ─── Analyse des expressions : hiérarchie de priorité ───────────────────────
  //
  // En mathématiques, 2 + 3 * 4 = 14 (pas 20), car la multiplication a priorité.
  // Pour respecter ça, le parser utilise une chaîne de fonctions récursives :
  //
  //   parseExpr()   → point d'entrée (priorité la plus faible)
  //   parseOr()     → "ou" (priorité 1)
  //   parseAnd()    → "et" (priorité 2)
  //   parseCmp()    → ==, !=, <, >, <=, >= (priorité 3)
  //   parseAdd()    → +, - (priorité 4)
  //   parseMul()    → *, /, % (priorité 5)
  //   parseUnary()  → non, - (négatif unaire) (priorité 6)
  //   parsePrimary()→ valeur, variable, appel, liste, dict, parenthèses (priorité la plus forte)
  //
  // Chaque niveau appelle le niveau suivant (plus fort) pour son côté gauche.
  // Si l'opérateur de ce niveau est trouvé, on l'englobe dans un nœud BINARY.

  parseExpr()  { return this.parseOr(); }

  parseOr() {
    let l = this.parseAnd(); // Évaluer la partie gauche (plus forte priorité)
    // Boucle : si on voit "ou", créer un nœud BINARY et continuer
    while (this.peek().kind === 'OR') {
      this.advance();
      l = { type: 'BINARY', op: 'OR', left: l, right: this.parseAnd() };
    }
    return l;
  }

  parseAnd() {
    let l = this.parseCmp();
    while (this.peek().kind === 'AND') {
      this.advance();
      l = { type: 'BINARY', op: 'AND', left: l, right: this.parseCmp() };
    }
    return l;
  }

  parseCmp() {
    let l = this.parseAdd();
    while (this.peek().kind === 'OP' && ['==','!=','<','>','<=','>='].includes(this.peek().value)) {
      const op = this.advance().value;
      l = { type: 'BINARY', op, left: l, right: this.parseAdd() };
    }
    return l;
  }

  parseAdd() {
    let l = this.parseMul();
    while (this.peek().kind === 'OP' && ['+', '-'].includes(this.peek().value)) {
      const op = this.advance().value;
      l = { type: 'BINARY', op, left: l, right: this.parseMul() };
    }
    return l;
  }

  parseMul() {
    let l = this.parseUnary();
    while (this.peek().kind === 'OP' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.advance().value;
      l = { type: 'BINARY', op, left: l, right: this.parseUnary() };
    }
    return l;
  }

  parseUnary() {
    // "non" (NOT logique) et "-" (négatif) sont des opérateurs unaires :
    // ils n'ont qu'un seul opérande, à leur droite.
    if (this.peek().kind === 'NOT') {
      this.advance();
      return { type: 'UNARY', op: 'NOT', operand: this.parseUnary() }; // Récursif !
    }
    if (this.peek().kind === 'OP' && this.peek().value === '-') {
      this.advance();
      return { type: 'UNARY', op: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  // ── Analyser une expression "primaire" : la valeur la plus basique ───────────
  // C'est le niveau le plus bas de la récursion : nombres, chaînes, variables,
  // listes, dictionnaires, appels de fonction, et expressions entre parenthèses.
  parsePrimary() {
    const tok = this.peek();

    // ── Liste littérale : [elem1, elem2, ...]
    if (tok.kind === 'LBRACKET') {
      this.advance();
      const elements = [];
      if (this.peek().kind !== 'RBRACKET') {
        elements.push(this.parseExpr());
        while (this.peek().kind === 'COMMA') { this.advance(); elements.push(this.parseExpr()); }
      }
      this.expect('RBRACKET');
      return { type: 'LISTE', elements, line: tok.line };
    }

    // ── Dictionnaire littéral : { "clé": valeur, ... }
    // Un dictionnaire associe des clés à des valeurs.
    if (tok.kind === 'LBRACE') {
      this.advance();
      const pairs = [];
      if (this.peek().kind !== 'RBRACE') {
        const k = this.parseExpr(); // Clé
        this.expect('COLON');       // ":"
        const v = this.parseExpr(); // Valeur
        pairs.push({ key: k, value: v });
        while (this.peek().kind === 'COMMA') {
          this.advance();
          if (this.peek().kind === 'RBRACE') break; // Virgule finale tolérée
          const k2 = this.parseExpr();
          this.expect('COLON');
          const v2 = this.parseExpr();
          pairs.push({ key: k2, value: v2 });
        }
      }
      this.expect('RBRACE');
      return { type: 'DICT', pairs, line: tok.line };
    }

    // ── Valeurs littérales : nombre, chaîne, vrai, faux
    if (tok.kind === 'NUMBER') { this.advance(); return { type: 'VALEUR', valueType: 'number',  value: tok.value, line: tok.line }; }
    if (tok.kind === 'STRING') { this.advance(); return { type: 'VALEUR', valueType: 'string',  value: tok.value, line: tok.line }; }
    if (tok.kind === 'TRUE')   { this.advance(); return { type: 'VALEUR', valueType: 'boolean', value: true,      line: tok.line }; }
    if (tok.kind === 'FALSE')  { this.advance(); return { type: 'VALEUR', valueType: 'boolean', value: false,     line: tok.line }; }

    // ── Appel de fonction comme expression : nom(...)
    // Exemple : afficher additionner(2, 3) → additionner est appelé dans une expr
    if (tok.kind === 'IDENT' && this.peek(1).kind === 'OP' && this.peek(1).value === '(') {
      return this.parseCall();
    }

    // ── Accès à un élément de liste ou de dictionnaire : nom[index]
    if (tok.kind === 'IDENT' && this.peek(1).kind === 'LBRACKET') {
      const name = this.advance();
      this.advance(); // Consommer "["
      const index = this.parseExpr(); // L'index peut être n'importe quelle expression
      this.expect('RBRACKET');
      return { type: 'ACCES', list: name.value, index, line: name.line };
    }

    // ── Référence à une variable : juste un identifiant seul
    if (tok.kind === 'IDENT') { this.advance(); return { type: 'REFERENCE', name: tok.value, line: tok.line }; }

    // ── Expression entre parenthèses : (expr)
    // Les parenthèses permettent de forcer une priorité : (2 + 3) * 4 = 20
    if (tok.kind === 'OP' && tok.value === '(') {
      this.advance();
      const e = this.parseExpr();
      this.expectOp(')');
      return e; // On retourne directement le nœud sans enveloppe supplémentaire
    }

    this.err(this.grammar.errors.UNEXPECTED_TOKEN + ': "' + tok.value + '"');
  }
}

module.exports = { Parser };
