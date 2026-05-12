# Contribuer à Spira

Merci de l'intérêt pour Spira. Ce document explique comment contribuer, en particulier pour **ajouter le support d'une nouvelle langue**.

---

## Types de contributions

### 1. Ajouter une langue (le plus impactant)

C'est l'action la plus directement liée à la mission de Spira.

Chaque langue est définie par **un bloc de configuration** dans `src/grammars.js`. Il contient :

- Les **mots-clés** natifs (traduction des concepts universels)
- Les **messages d'erreur** dans la langue
- Les **noms des fonctions intégrées**

**Exemple — ajouter le portugais :**

```javascript
pt: {
  name: 'Português',
  family: 'SVO',
  direction: 'LTR',
  keywords: {
    LET: 'seja',    IF: 'se',       THEN: 'então',  ELSE: 'senão',
    END: 'fim',     PRINT: 'exibir', WHILE: 'enquanto', DO: 'repetir',
    MAKE: 'fazer',  GIVE: 'retornar', WITH: 'com',
    ADD_TO: 'adicionar', TO: 'a',   IMPORT: 'usar',
    FOREACH: 'para', EACH: 'cada',  IN: 'em',
    TEST: 'testar', ASSERT: 'verificar', THAT: 'que',
    TRUE: 'verdadeiro', FALSE: 'falso',
    AND: 'e', OR: 'ou', NOT: 'não', NOTHING: 'Nada'
  },
  errors: {
    UNKNOWN_TOKEN: 'Símbolo desconhecido',
    UNEXPECTED_TOKEN: 'Símbolo inesperado',
    EXPECTED: 'Esperado',
    UNDEFINED_VAR: 'Variável não definida',
    DIV_ZERO: 'Divisão por zero',
    UNCLOSED_STRING: 'String não fechada',
    INFINITE_LOOP: 'Loop infinito detectado',
    UNDEFINED_FUNC: 'Função não definida',
    ARG_MISMATCH: 'Número incorreto de argumentos',
    INDEX_OUT: 'Índice fora dos limites',
    ASSERTION_FAILED: 'Asserção falhou'
  },
  builtins: {
    SIZE: 'tamanho',   ASK: 'perguntar',  NUM: 'numero',
    TXT: 'texto',      LEN: 'comprimento', UPPER: 'maiusculas',
    LOWER: 'minusculas', CONTAINS: 'contem', SPLIT: 'dividir'
  }
}
```

**Étapes :**

1. Fork le dépôt
2. Ajoute ton bloc dans `src/grammars.js`
3. Crée un fichier de test : `tests/tester_pt.sp`
4. Vérifie que les tests passent : `node src/cli.js run tests/tester_pt.sp`
5. Ouvre une Pull Request

**Priorités actuelles :**

| Langue | Code | Famille grammaticale | Statut |
|---|---|---|---|
| Portugais | `pt` | SVO | 🔴 recherché |
| Wolof | `wo` | SVO | 🔴 recherché |
| Mandarin | `zh` | SVO/isolant | 🔴 recherché |
| Arabe | `ar` | VSO / droite→gauche | 🔴 recherché |
| Japonais | `ja` | SOV | 🔴 recherché |
| Hindi | `hi` | SOV | 🔴 recherché |
| Swahili | `sw` | SVO | 🔴 recherché |

> **Note :** les locuteurs natifs ont priorité. Si tu proposes une grammaire pour une langue que tu parles couramment, mentionne-le dans ta Pull Request.

---

### 2. Signaler un bug

Ouvre une [issue](https://github.com/LutHub-cmd/spira/issues) avec :

- Le code Spira qui pose problème (le plus court possible)
- La langue utilisée (`@langue fr`, `@langue en`, etc.)
- Le message d'erreur complet
- Ce que tu attendais comme résultat

---

### 3. Proposer une fonctionnalité

Ouvre une issue avec l'étiquette **`proposition`** et décris :

- Le problème que ça résout
- Un exemple de syntaxe que tu imagines
- Pourquoi c'est important pour la mission de Spira

---

### 4. Écrire des programmes d'exemple

Tout programme réel écrit en Spira est précieux. Les programmes d'exemple servent à :

- Tester le langage en conditions réelles
- Montrer ce qu'il est possible de faire
- Former les nouveaux utilisateurs

Dépose tes programmes dans `examples/` et ouvre une Pull Request.

---

## Environnement de développement

```bash
git clone https://github.com/LutHub-cmd/spira.git
cd spira
node src/cli.js run examples/hello.sp
node src/cli.js run tests/tester_fonctions.sp
```

---

## Conventions de code

Avant de soumettre du code :

- Lis [CONVENTIONS.md](CONVENTIONS.md)
- Vérifie que les tests existants passent : `node src/cli.js run tests/tester_fonctions.sp`
- Ajoute des tests pour les nouvelles fonctionnalités

---

*Spira est libre, ouvert, et appartient à ceux qui l'écrivent.*
