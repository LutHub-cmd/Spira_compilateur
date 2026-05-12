@langue fr

— Exemple 5 : Les listes

— Créer une liste
soit prénoms = ["Alice", "Bruno", "Camille", "David"]

afficher "Participants ("+taille(prénoms)+") :"
soit i = 0
tantque i < taille(prénoms) répéter
  afficher "  " + (i + 1) + ". " + prénoms[i]
  i = i + 1
fin

— Ajouter un élément
ajouter "Eva" à prénoms
afficher "Eva ajoutée. Total : " + taille(prénoms)

— Modifier un élément
prénoms[0] = "Alexis"
afficher "Premier renommé : " + prénoms[0]

— Calcul de moyenne sur une liste de notes
soit notes = [14, 17, 9, 15, 12, 18]
soit total = 0
soit j = 0
tantque j < taille(notes) répéter
  total = total + notes[j]
  j = j + 1
fin
afficher "Moyenne : " + total / taille(notes)
