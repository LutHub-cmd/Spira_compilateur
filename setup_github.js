#!/usr/bin/env node
/* ============================================================
   SPIRA — Préparation du dépôt GitHub
   Lance : node setup_github.js
   
   Ce script organise les fichiers dans la structure
   attendue par GitHub et génère un commit initial.
   ============================================================ */
'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = process.cwd();

function write(p, c) {
  const full = path.join(BASE, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, c, 'utf8');
  console.log('  \u2713 ' + p);
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.log('  \u26a0 Introuvable : ' + src);
    return;
  }
  const full = path.join(BASE, dest);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.copyFileSync(src, full);
  console.log('  \u2713 ' + dest);
}

console.log('\n  Spira v0.5.0 \u2014 Préparation GitHub\n');

// ── 1. Vérifier que les fichiers sources existent ──
const requiredFiles = ['src/cli.js', 'src/grammars.js', 'install.js'];
for (const f of requiredFiles) {
  if (!fs.existsSync(path.join(BASE, f))) {
    console.error('  \u274c Fichier manquant : ' + f);
    console.error('  Lance d\'abord : node install.js\n');
    process.exit(1);
  }
}

// ── 2. Créer les dossiers ──
['docs', 'exemples', 'modules', 'tests', 'extension/syntaxes', 'spira_paquets', 'output'].forEach(d => {
  fs.mkdirSync(path.join(BASE, d), { recursive: true });
});

// ── 3. Copier exemples → exemples/ ──
if (fs.existsSync(path.join(BASE, 'examples'))) {
  for (const f of fs.readdirSync(path.join(BASE, 'examples'))) {
    if (f.endsWith('.sp')) copyFile('examples/' + f, 'exemples/' + f);
  }
}

// ── 4. Déplacer les fichiers de doc ──
if (fs.existsSync(path.join(BASE, 'spira-manifeste.md'))) {
  copyFile('spira-manifeste.md', 'docs/manifeste.md');
}
if (fs.existsSync(path.join(BASE, 'spira-conceptualisation.md'))) {
  copyFile('spira-conceptualisation.md', 'docs/conceptualisation.md');
}
if (fs.existsSync(path.join(BASE, 'spira-tutoriel.md'))) {
  copyFile('spira-tutoriel.md', 'docs/tutoriel.md');
}
if (fs.existsSync(path.join(BASE, 'spira-documentation.md'))) {
  copyFile('spira-documentation.md', 'docs/reference.md');
}

console.log('');
console.log('  \u2713 Structure du dépôt prête.\n');
console.log('  Prochaines étapes :\n');
console.log('  1. Ajoute README.md, LICENSE, .gitignore, CONTRIBUTING.md à la racine');
console.log('     (fichiers disponibles dans le dossier github/ de Claude)\n');
console.log('  2. Initialise Git :');
console.log('     git init');
console.log('     git add .');
console.log('     git commit -m "Spira v0.5.0 — premier commit"\n');
console.log('  3. Connecte à GitHub :');
console.log('     git remote add origin https://github.com/TON_USERNAME/spira.git');
console.log('     git branch -M main');
console.log('     git push -u origin main\n');
console.log('  4. Active GitHub Pages (optionnel) :');
console.log('     Settings → Pages → Source : main → / → Save\n');
