@langue fr

— Exemple : les dictionnaires

— Créer un dictionnaire
soit élève = {
  "nom": "Luther",
  "âge": 25,
  "note": 17
}

afficher "Nom : " + élève["nom"]
afficher "Âge : " + élève["âge"]
afficher "Note : " + élève["note"]

— Modifier une valeur
élève["note"] = 18
afficher "Nouvelle note : " + élève["note"]

— Liste de dictionnaires
soit classe = [
  { "nom": "Alice", "note": 15 },
  { "nom": "Bruno", "note": 12 },
  { "nom": "Camille", "note": 18 }
]

afficher "Résultats de la classe :"
pour chaque é dans classe répéter
  afficher "  " + é["nom"] + " → " + é["note"] + "/20"
fin
