@langue fr

— Exemple : fonctions sur le texte

soit phrase = "Bonjour le monde"

afficher longueur(phrase)
afficher majuscules(phrase)
afficher minuscules(phrase)
afficher contient(phrase, "monde")
afficher contient(phrase, "paris")

— Découper du texte
soit csv = "Alice,Bruno,Camille,David"
soit noms = découper(csv, ",")

afficher "Participants :"
pour chaque nom dans noms répéter
  afficher "  · " + nom
fin

— Cas pratique : nettoyer des données
soit saisie = "  LUTHER  "
afficher "Brut : " + saisie
afficher "Propre : " + minuscules(saisie)
