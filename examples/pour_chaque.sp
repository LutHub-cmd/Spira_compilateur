@langue fr

— Exemple : pour chaque + raccourcis +=

soit fruits = ["pomme", "banane", "cerise", "mangue"]

afficher "Fruits de la liste :"
pour chaque fruit dans fruits répéter
  afficher "  → " + fruit
fin

— Raccourcis d'assignation
soit score = 0
score += 10
score += 5
afficher "Score après +10 +5 : " + score

score -= 3
afficher "Score après -3 : " + score

score *= 2
afficher "Score après *2 : " + score

— Compter avec pour chaque
soit total = 0
soit notes = [14, 17, 9, 15, 12, 18]

pour chaque note dans notes répéter
  total += note
fin

afficher "Somme des notes : " + total
afficher "Moyenne : " + total / taille(notes)
