'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER (Transpileur entre langues Spira)
//
// Rôle : prendre un AST et le re-transformer en code SOURCE Spira,
// mais dans une autre langue.
//
// Exemple : un programme Spira en français peut être "rendu" en anglais ou
// en espagnol sans changer la logique — seuls les mots-clés changent.
//
// C'est l'inverse du Tokenizer + Parser : au lieu de Source → AST,
// on fait AST → Source.
//
// Ce fichier est moins commenté car sa structure miroire exactement le CodeGen.
// La différence : CodeGen produit du JavaScript, le Renderer produit du Spira.
// ─────────────────────────────────────────────────────────────────────────────

class Renderer {
  // Paramètre :
  //   grammar : la grammaire CIBLE (la langue dans laquelle on veut rendre le code)
  constructor(grammar) {
    this.grammar = grammar;
    this.kw = grammar.keywords;       // Raccourci vers les mots-clés de la langue cible
    this.bi = grammar.builtins || {}; // Raccourci vers les fonctions intégrées
  }

  // ── Rendre tout l'AST en code source Spira ───────────────────────────────
  // Retourne une chaîne de texte : le programme complet dans la langue cible
  render(ast) {
    return '— Rendu en : ' + this.grammar.name + '\n\n' +
      ast.body.map(s => this.rS(s, 0)).join('\n');
    // map() transforme chaque nœud du body en sa représentation textuelle.
    // join('\n') les réunit avec des sauts de ligne.
  }

  // ── Produire l'indentation pour un niveau donné ──────────────────────────
  // Paramètre lv : le niveau d'imbrication (0 = racine, 1 = dans une fonction, etc.)
  ind(l) { return '  '.repeat(l); }

  // ── Rendre une instruction ────────────────────────────────────────────────
  // Paramètres :
  //   node : le nœud AST à rendre
  //   lv   : le niveau d'indentation courant
  rS(node, lv) {
    const i = this.ind(lv);
    switch (node.type) {

      case 'TRANSFORMATION': {
        // Reconstruire "faire nom [avec p1, p2] ... fin" dans la langue cible
        const ps = node.params.length > 0 ? ' ' + this.kw.WITH + ' ' + node.params.join(', ') : '';
        return i + this.kw.MAKE + ' ' + node.name + ps + '\n' +
          node.body.map(s => this.rS(s, lv + 1)).join('\n') + '\n' +
          i + this.kw.END;
        // lv + 1 : augmenter l'indentation pour le corps de la fonction
      }

      case 'RETOUR':
        return i + this.kw.GIVE + ' ' + this.rE(node.value);

      case 'APPEL':
        return i + this.rE(node); // Un appel est une expression, rE() gère ça

      case 'AJOUTER':
        return i + this.kw.ADD_TO + ' ' + this.rE(node.element) + ' ' + this.kw.TO + ' ' + node.list;

      case 'LIEN_LISTE':
        return i + node.name + '[' + this.rE(node.index) + ']=' + this.rE(node.value);

      case 'LIEN':
        // Déclaration vs réassignation (même logique que dans le CodeGen)
        return node.mutation
          ? i + node.name + ' = ' + this.rE(node.value)
          : i + this.kw.LET + ' ' + node.name + ' = ' + this.rE(node.value);

      case 'CONDITION': {
        let o = i + this.kw.IF + ' ' + this.rE(node.test) + ' ' + this.kw.THEN + '\n' +
          node.consequent.map(s => this.rS(s, lv + 1)).join('\n');
        if (node.alternate && node.alternate.length > 0)
          o += '\n' + i + this.kw.ELSE + '\n' + node.alternate.map(s => this.rS(s, lv + 1)).join('\n');
        return o + '\n' + i + this.kw.END;
      }

      case 'REPETITION':
        return i + this.kw.WHILE + ' ' + this.rE(node.test) + ' ' + this.kw.DO + '\n' +
          node.body.map(s => this.rS(s, lv + 1)).join('\n') + '\n' +
          i + this.kw.END;

      case 'EFFET':
        // "afficher expr" dans la langue cible
        return node.action === 'PRINT'
          ? i + this.kw.PRINT + ' ' + this.rE(node.value)
          : i + '— ' + node.action;

      default: return i + '— ' + node.type;
    }
  }

  // ── Rendre une expression ─────────────────────────────────────────────────
  // Retourne une sous-expression textuelle (sans saut de ligne ni ";")
  rE(node) {
    switch (node.type) {

      case 'VALEUR':
        // Afficher les booléens avec les mots-clés de la langue cible (vrai/true/verdadero)
        return node.valueType === 'string'  ? '"' + node.value + '"'
             : node.valueType === 'boolean' ? (node.value ? this.kw.TRUE : this.kw.FALSE)
             : String(node.value);

      case 'REFERENCE':
        return node.name; // Les noms de variables restent les mêmes quelle que soit la langue

      case 'LISTE':
        return '[' + node.elements.map(e => this.rE(e)).join(', ') + ']';

      case 'ACCES':
        return node.list + '[' + this.rE(node.index) + ']';

      case 'APPEL': {
        // Récupérer le nom traduit de la builtin dans la langue cible
        // (cette logique est simplifiée — elle ne gère que la première builtin)
        const fname = node.name === Object.values(this.bi || {})[0] ? this.bi.SIZE : node.name;
        return fname + '(' + node.args.map(a => this.rE(a)).join(', ') + ')';
      }

      case 'UNARY':
        // Opérateur unaire dans la langue cible : "non x" / "not x" / "no x"
        return node.op === 'NOT'
          ? this.kw.NOT + ' ' + this.rE(node.operand)
          : '-' + this.rE(node.operand);

      case 'BINARY': {
        const L = this.rE(node.left), R = this.rE(node.right);
        // Traduire "AND" et "OR" dans la langue cible (et/and/y, ou/or/o)
        const op = node.op === 'AND' ? ' ' + this.kw.AND + ' '
                 : node.op === 'OR'  ? ' ' + this.kw.OR  + ' '
                 : ' ' + node.op + ' ';
        // Ajouter des parenthèses si l'un des côtés est aussi une expression binaire
        // (pour préserver la lisibilité et la priorité dans le code rendu)
        return (node.left.type === 'BINARY' || node.right.type === 'BINARY')
          ? '(' + L + op + R + ')'
          : L + op + R;
      }

      default: return '?';
    }
  }
}

module.exports = { Renderer };
