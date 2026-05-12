@langue fr

— Exemple 8 : Utiliser un module
utiliser "../modules/maths.sp"

afficher "2 puissance 10 = " + puissance(2, 10)
afficher "Maximum de 42 et 17 = " + maximum(42, 17)

soit n = 7
si est_pair(n) alors
  afficher n + " est pair"
sinon
  afficher n + " est impair"
fin
