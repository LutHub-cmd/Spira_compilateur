@langue fr

— Exemple 6 : Conversation avec l'utilisateur

afficher "Bienvenue dans Spira !"
afficher "────────────────────────"

soit prénom = demander("Comment tu t'appelles ? ")
soit âge_texte = demander("Quel âge as-tu ? ")

afficher "────────────────────────"
afficher "Bonjour " + prénom + " !"
afficher "Tu as " + âge_texte + " ans."

soit réponse = demander("Tu aimes coder ? (oui/non) ")

si réponse == "oui" alors
  afficher "Parfait, Spira est fait pour toi."
sinon
  afficher "Pas de problème, Spira va changer ça !"
fin
