# Extension Spira pour VS Code

> Coloration syntaxique, autocomplétion des brackets et indentation automatique pour les fichiers `.sp`.

## Installation

### Méthode 1 — Dossier extensions (recommandée)

1. Copie ce dossier `spira-vscode` dans le répertoire des extensions VS Code :

**macOS / Linux :**
```bash
cp -r spira-vscode ~/.vscode/extensions/spira-lang-1.1.0
```

**Windows :**
```
Copie spira-vscode dans : %USERPROFILE%\.vscode\extensions\spira-lang-1.1.0
```

2. Redémarre VS Code.

3. Ouvre un fichier `.sp` — la coloration syntaxique s'active automatiquement.

### Méthode 2 — Via la palette de commandes

1. Dans VS Code : `Cmd+Shift+P` → `Extensions: Install from VSIX`
2. Sélectionne le fichier `.vsix` (si disponible)

## Ce que l'extension apporte

- **Coloration syntaxique** — mots-clés, chaînes, nombres, commentaires, fonctions intégrées
- **Commentaires** — `Cmd+/` pour commenter/décommenter avec `—`
- **Auto-fermeture** — `"`, `[`, `(`, `{` se ferment automatiquement
- **Indentation automatique** — après `alors`, `répéter`, `faire`, etc.
- **Repliage de code** — les blocs `si`/`fin`, `tantque`/`fin`, `faire`/`fin` se replient

## Aperçu des couleurs

| Élément | Couleur |
|---|---|
| Mots-clés (`si`, `alors`, `fin`) | Bleu |
| Déclarations (`soit`, `faire`) | Violet |
| Chaînes de texte | Orange |
| Nombres | Vert clair |
| Commentaires (`—`) | Vert |
| Fonctions intégrées | Cyan |
| Booléens (`vrai`, `faux`) | Bleu clair |

## Fichiers supportés

| Extension | Langue |
|---|---|
| `.sp` avec `@langue fr` | Français |
| `.sp` avec `@langue en` | English |
| `.sp` avec `@langue es` | Español |

---

*Extension Spira v1.1.0 — Auteur : Luther*
