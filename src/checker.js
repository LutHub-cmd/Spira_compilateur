'use strict';
const { SpiraError } = require('./tokenizer');

// ─────────────────────────────────────────────────────────────────────────────
// CHECKER (Vérificateur sémantique)
//
// Rôle : parcourir l'AST produit par le Parser et vérifier que le programme
// a du SENS, au-delà de la simple syntaxe. Par exemple :
//   - Une variable utilisée a-t-elle bien été déclarée avant ?
//   - Une fonction appelée existe-t-elle ?
//   - Le bon nombre d'arguments est-il passé à la fonction ?
//   - Y a-t-il une division par zéro évidente ?
//
// Le Checker ne génère pas de code. Il peut lever des erreurs (fatales)
// ou des avertissements (warnings, non-fatals).
//
// Concept clé : les "portées" (scopes)
// Une portée est une zone du programme dans laquelle une variable existe.
// Exemple :
//   soit x = 5          ← x existe ici
//   faire f avec y      ← y existe SEULEMENT dans f
//     afficher y        ← ok
//   fin
//   afficher y          ← ERREUR : y n'existe plus ici
//
// Le Checker gère ça avec une pile de portées : on empile en entrant dans
// un bloc (fonction, condition, boucle) et on dépile en en sortant.
// ─────────────────────────────────────────────────────────────────────────────

class Checker {
  // Paramètre :
  //   grammar : la grammaire active (pour les messages d'erreur localisés)
  constructor(grammar) {
    this.grammar   = grammar;

    // Pile de portées : chaque élément est un Set (ensemble) de noms de variables.
    // On commence avec une portée globale vide.
    // Un Set est comme un tableau, mais chaque valeur est unique et la recherche est rapide.
    this.scopes    = [new Set()];

    // Liste des avertissements non-fatals accumulés pendant la vérification.
    this.warnings  = [];

    // Map des fonctions déclarées : nom → nombre de paramètres attendus.
    // Une Map est un dictionnaire clé → valeur, comme un objet mais plus flexible.
    this.functions = new Map();

    // Set des noms de fonctions intégrées (taille, demander, nombre, texte...).
    // Object.values() extrait toutes les valeurs d'un objet sous forme de tableau.
    this.builtins  = new Set(Object.values(grammar.builtins || {}));
  }

  // ── Méthodes de gestion de la pile de portées ──────────────────────────────

  // Retourner la portée courante (la dernière empilée = la plus locale)
  scope()        { return this.scopes[this.scopes.length - 1]; }

  // Empiler une nouvelle portée (entrer dans un bloc : fonction, condition, boucle)
  push()         { this.scopes.push(new Set()); }

  // Dépiler la portée courante (sortir du bloc)
  pop()          { this.scopes.pop(); }

  // Déclarer une variable dans la portée courante
  declare(n)     { this.scope().add(n); }

  // Vérifier si une variable est connue dans n'importe quelle portée de la pile.
  // "some()" s'arrête dès qu'il trouve un Set qui contient le nom cherché.
  known(n)       { return this.scopes.some(s => s.has(n)); }

  // Déclencher une erreur fatale
  err(msg, line) { throw new SpiraError(msg, line || 0, 0, this.grammar); }


  // ── Point d'entrée de la vérification ────────────────────────────────────────
  // Paramètre : ast, l'arbre produit par le Parser
  // Retourne : le tableau des avertissements (peut être vide)
  check(ast) {
    // Passe 1 : enregistrer toutes les fonctions déclarées dans le programme.
    // On fait ça AVANT de vérifier les appels, pour permettre les appels croisés
    // (fonction A appelle fonction B déclarée plus bas dans le fichier).
    for (const n of ast.body)
      if (n.type === 'TRANSFORMATION') this.functions.set(n.name, n.params.length);

    // Passe 2 : vérifier toutes les instructions du programme
    this.checkBlock(ast.body);
    return this.warnings;
  }

  // ── Vérifier un bloc d'instructions (liste de nœuds) ─────────────────────────
  checkBlock(stmts) {
    for (const s of stmts) this.checkStmt(s);
  }


  // ── Vérifier une instruction ──────────────────────────────────────────────────
  // Utilise switch pour traiter chaque type de nœud différemment.
  checkStmt(node) {
    switch (node.type) {

      case 'IMPORT':
        break; // Les imports sont résolus avant (dans cli.js), rien à vérifier ici.

      case 'TRANSFORMATION':
        // Vérifier le corps d'une fonction dans une nouvelle portée.
        this.push();                                    // Nouvelle portée pour la fonction
        node.params.forEach(p => this.declare(p));      // Déclarer chaque paramètre
        this.checkBlock(node.body);                     // Vérifier le corps
        this.pop();                                     // Sortir de la portée
        // forEach() appelle une fonction pour chaque élément du tableau.
        // C'est équivalent à : for (const p of node.params) this.declare(p);
        break;

      case 'RETOUR':
        this.checkExpr(node.value); // La valeur retournée doit être une expression valide
        break;

      case 'APPEL':
        this.checkCall(node); // Vérifier l'appel de fonction
        break;

      case 'AJOUTER':
        this.checkExpr(node.element); // L'élément à ajouter doit être valide
        // La liste cible doit avoir été déclarée
        if (!this.known(node.list))
          this.err(this.grammar.errors.UNDEFINED_VAR + ': "' + node.list + '"', node.line);
        break;

      case 'LIEN_LISTE':
        // Accès par index : la liste et l'index doivent être valides
        if (!this.known(node.name))
          this.err(this.grammar.errors.UNDEFINED_VAR + ': "' + node.name + '"', node.line);
        this.checkExpr(node.index);
        this.checkExpr(node.value);
        break;

      case 'LIEN':
        this.checkExpr(node.value); // Vérifier la valeur assignée
        if (node.mutation) {
          // Réassignation : la variable doit déjà exister
          if (!this.known(node.name))
            this.err(this.grammar.errors.UNDEFINED_VAR + ': "' + node.name + '"', node.line);
        } else {
          // Déclaration : ajouter la variable à la portée courante
          this.declare(node.name);
        }
        break;

      case 'CONDITION':
        this.checkExpr(node.test); // La condition doit être valide
        // Chaque branche (alors / sinon) a sa propre portée :
        // les variables déclarées dedans ne "fuient" pas à l'extérieur.
        this.push(); this.checkBlock(node.consequent); this.pop();
        if (node.alternate) { this.push(); this.checkBlock(node.alternate); this.pop(); }
        break;

      case 'REPETITION':
        this.checkExpr(node.test);
        this.push(); this.checkBlock(node.body); this.pop();
        break;

      case 'POUR_CHAQUE':
        // La liste source doit exister
        if (!this.known(node.list))
          this.err(this.grammar.errors.UNDEFINED_VAR + ': "' + node.list + '"', node.line);
        this.push();
        this.declare(node.elem); // La variable d'itération est déclarée dans la boucle
        this.checkBlock(node.body);
        this.pop();
        break;

      case 'TEST':
        // Un bloc de test a sa propre portée (isolation)
        this.push();
        this.checkBlock(node.body);
        this.pop();
        break;

      case 'ASSERTION':
        this.checkExpr(node.condition);
        break;

      case 'EFFET':
        if (node.action === 'PRINT') this.checkExpr(node.value);
        break;
    }
  }


  // ── Vérifier un appel de fonction ─────────────────────────────────────────────
  // Vérifie que :
  //   1. La fonction existe (builtin ou définie par l'utilisateur)
  //   2. Le bon nombre d'arguments est passé
  checkCall(node) {
    // Si c'est une fonction intégrée (taille, demander, etc.) → juste vérifier les args
    if (this.builtins.has(node.name)) {
      node.args.forEach(a => this.checkExpr(a));
      return;
    }
    // Si la fonction n'existe pas du tout → erreur fatale
    if (!this.functions.has(node.name))
      this.err(this.grammar.errors.UNDEFINED_FUNC + ': "' + node.name + '"', node.line);

    // Vérifier le nombre d'arguments (warning, pas erreur fatale)
    const exp = this.functions.get(node.name); // Nombre d'arguments attendus
    if (node.args.length !== exp)
      this.warnings.push('"' + node.name + '" attend ' + exp + ' arg(s), reçu ' + node.args.length);

    // Vérifier chaque argument
    node.args.forEach(a => this.checkExpr(a));
  }


  // ── Vérifier une expression ───────────────────────────────────────────────────
  // Une expression est tout ce qui produit une valeur : 2+3, x, saluer("Luther"), etc.
  // Cette méthode est récursive : un nœud BINARY contient lui-même des expressions.
  checkExpr(node) {
    switch (node.type) {

      case 'VALEUR':
        break; // Un littéral (42, "bonjour", vrai) est toujours valide.

      case 'LISTE':
        // Vérifier chaque élément de la liste
        node.elements.forEach(e => this.checkExpr(e));
        break;

      case 'DICT':
        // Vérifier chaque paire clé/valeur du dictionnaire
        node.pairs.forEach(p => { this.checkExpr(p.key); this.checkExpr(p.value); });
        break;

      case 'ACCES':
        // Accès liste[index] : la liste doit exister, l'index doit être valide
        if (!this.known(node.list))
          this.err(this.grammar.errors.UNDEFINED_VAR + ': "' + node.list + '"', node.line);
        this.checkExpr(node.index);
        break;

      case 'REFERENCE':
        // Utilisation d'une variable : elle doit avoir été déclarée
        if (!this.known(node.name))
          this.err(this.grammar.errors.UNDEFINED_VAR + ': "' + node.name + '"', node.line);
        break;

      case 'UNARY':
        // Opérateur unaire (non, -) : vérifier l'opérande
        this.checkExpr(node.operand);
        break;

      case 'BINARY':
        // Opérateur binaire : vérifier les deux côtés
        this.checkExpr(node.left);
        this.checkExpr(node.right);
        // Détection statique de la division par zéro littérale (ex: x / 0)
        if (node.op === '/' && node.right.type === 'VALEUR' && node.right.value === 0)
          this.err(this.grammar.errors.DIV_ZERO, node.line);
        break;

      case 'APPEL':
        this.checkCall(node);
        break;
    }
  }
}

module.exports = { Checker };
