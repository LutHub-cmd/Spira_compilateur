# Spira

![Version](https://img.shields.io/badge/version-0.7.0-yellow)
![Licence](https://img.shields.io/badge/licence-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-14%2B-brightgreen)
![Statut](https://img.shields.io/badge/statut-développement_actif-orange)

> *Le code est universel. Les langues qui l'écrivent doivent l'être aussi.*

**Spira** est un langage de programmation où chaque développeur écrit dans sa langue maternelle — sans passer par l'anglais.

> ⚠️ **v0.7.0 — développement actif.** Spira n'est pas encore stable pour la production. La v1.0.0 sera la première version stable.

---

## Démonstration rapide

Le même programme, en trois langues. Un seul Noyau sémantique.

```spira
@langue fr

soit fruits = ["pomme", "banane", "cerise"]

pour chaque fruit dans fruits répéter
  afficher "J'aime les " + fruit + "s"
fin
```

```spira
@langue en

let fruits = ["apple", "banana", "cherry"]

for each fruit in fruits repeat
  display "I love " + fruit + "s"
end
```

```spira
@langue es

sea frutas = ["manzana", "plátano", "cereza"]

para cada fruta en frutas repetir
  mostrar "Me gustan las " + fruta + "s"
fin
```

Les trois compilent vers le même JavaScript. Les variables gardent leurs noms d'origine. Seuls les mots-clés changent.

---

## Installation

**Prérequis : Node.js 14+**

```bash
git clone https://github.com/LutHub-cmd/spira.git
cd spira
node src/cli.js help
```

**Alias pratique** — ajoute dans `~/.zshrc` ou `~/.bashrc` :

```bash
alias spira="node /chemin/absolu/vers/spira/src/cli.js"
```

Ensuite :

```bash
spira run principal.sp
spira help
```

---

## Commandes

```bash
spira run <fichier.sp>              # Compiler et exécuter
spira compile <fichier.sp> [-o out] # Compiler vers JavaScript
spira ast <fichier.sp>              # Afficher le Noyau sémantique
spira tester <fichier.sp>           # Exécuter les tests intégrés
spira help                          # Aide
```

---

## Ce que Spira sait faire (v0.7.0)

| Fonctionnalité | Exemple |
|---|---|
| Variables | `soit âge = 25` |
| Réassignation | `âge = 26` · `âge += 1` |
| Conditions | `si âge >= 18 alors ... sinon ... fin` |
| Boucles | `tantque i < 10 répéter ... fin` |
| Pour chaque | `pour chaque x dans liste répéter ... fin` |
| Fonctions | `faire saluer avec nom ... donner ... fin` |
| Appels | `saluer("Luther")` · `afficher additionner(2, 3)` |
| Listes | `soit l = [1, 2, 3]` · `ajouter x à l` · `taille(l)` |
| Dictionnaires | `soit d = { "nom": "Luther" }` · `d["nom"]` |
| Texte | `longueur(s)` · `majuscules(s)` · `minuscules(s)` |
| Texte (avancé) | `contient(s, "mot")` · `découper(s, ",")` |
| Conversion | `nombre("42")` · `texte(3.14)` |
| Saisie | `soit n = demander("Ton prénom ? ")` |
| Opérateurs | `et` · `ou` · `non` · `==` · `!=` · `<=` · `>=` |
| Tests | `tester "label" ... vérifier que expr ... fin` |
| Modules | `utiliser "modules/maths.sp"` |
| Multi-langue | `@langue fr` · `@langue en` · `@langue es` |

---

## Structure d'un projet Spira

```
mon-projet/
├── principal.sp     ← point d'entrée
├── modules/         ← code réutilisable
├── tests/           ← programmes de test
└── examples/        ← exemples fournis
```

---

## Extension éditeur

Le dossier `extension/` contient une extension de coloration syntaxique pour les fichiers `.sp`, compatible avec tout éditeur basé sur VS Code.

**Installation :**

```bash
# VS Code
cp -r extension ~/.vscode/extensions/spira-lang-0.5.0

# Cursor
cp -r extension ~/.cursor/extensions/spira-lang-0.5.0

# Windows — copier le dossier extension\ dans :
# %USERPROFILE%\.vscode\extensions\spira-lang-0.5.0
```

Redémarre l'éditeur. Les fichiers `.sp` sont colorés automatiquement.

---

## Architecture — Le Noyau sémantique

Spira repose sur un **Noyau sémantique universel** : une représentation interne du programme indépendante de toute langue humaine. Le code source dans ta langue est une *surface* ; le Noyau est ce qui est réellement compilé.

```
Surface (ta langue)  →  Tokenizer  →  Parser  →  Noyau (AST)  →  JavaScript
```

Les 7 concepts fondamentaux du Noyau :

| Concept | Signification |
|---|---|
| `VALEUR` | Une donnée littérale : nombre, texte, booléen |
| `LIEN` | Associer un nom à une valeur (variable) |
| `CONDITION` | Exécuter un bloc selon une condition |
| `RÉPÉTITION` | Répéter un bloc tant qu'une condition est vraie |
| `TRANSFORMATION` | Un bloc de code nommé et réutilisable (fonction) |
| `EFFET` | Une action visible (afficher) |
| `RETOUR` | La valeur produite par une transformation |

---

## Ajouter une langue

Spira supporte actuellement **français**, **anglais** et **espagnol**. Ajouter une nouvelle langue ne nécessite pas de modifier le compilateur — seulement un bloc de configuration dans `src/grammars.js` (environ 30 lignes).

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide complet.

---

## Feuille de route

```
v0.1.0  ✅  compilateur de base — variables, conditions, boucles, fonctions
v0.2.0  ✅  listes, dictionnaires, pour chaque, raccourcis +=
v0.3.0  ✅  fonctions texte, saisie, conversion
v0.4.0  ✅  modules, tests intégrés, assertions
v0.5.0  ✅  extension éditeur, coloration syntaxique
v0.6.0  ✅  refactoring, code commenté, structure canonique src/
v0.7.0  ✅  documentation complète, exemples, GitHub                ← maintenant
v0.8.0  →   try/catch, lambdas, types personnalisés
v0.9.0  →   stdlib étendue (maths, fichiers, dates, regex)
v1.0.0  →   version stable — testée, multilingue, documentée
v2.0.0  →   compilateur Rust → WebAssembly natif
```

---

## Philosophie

- **Coder est un acte de pensée**, pas de traduction
- **Aucune langue n'est supérieure** — le wolof, le mandarin et le français ont les mêmes droits
- **Rien ne se passe en douce** — les erreurs sont visibles, les effets sont déclarés
- **Spira appartient à ceux qui l'écrivent** — libre, ouvert, gratuit

Lire le [Manifeste complet](docs/manifeste.md).

---

## Contribuer

Les contributions sont bienvenues, en particulier :

- **Nouvelles langues** — un bloc de configuration dans `src/grammars.js`
- **Corrections de bugs** — ouvrir une issue avec le code reproductible
- **Programmes d'exemple** — tout programme réel écrit en Spira

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licence

MIT — fais-en ce que tu veux, dans toutes les langues.

---

## Auteur

Projet fondé par **Luther** · Mai 2026

---

*« Le jour où une fillette à Ouagadougou écrira sa première ligne de code dans sa langue maternelle, sans avoir d'abord appris l'anglais, et que ce code tournera dans le monde entier — Spira aura tenu sa promesse. »*

— [Manifeste de Spira](docs/manifeste.md)
