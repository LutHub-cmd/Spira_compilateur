@langue fr

— Exemple : tests intégrés Spira

— Fonctions à tester
faire additionner avec a, b
  donner a + b
fin

faire est_pair avec n
  donner n % 2 == 0
fin

faire maximum avec a, b
  si a >= b alors
    donner a
  sinon
    donner b
  fin
fin

— Tests
afficher "Lancement des tests Spira..."
afficher ""

tester "additionner(2, 3) vaut 5"
  vérifier que additionner(2, 3) == 5
fin

tester "additionner(0, 0) vaut 0"
  vérifier que additionner(0, 0) == 0
fin

tester "est_pair(4) est vrai"
  vérifier que est_pair(4) == vrai
fin

tester "est_pair(7) est faux"
  vérifier que est_pair(7) == faux
fin

tester "maximum(10, 3) vaut 10"
  vérifier que maximum(10, 3) == 10
fin

tester "maximum(3, 10) vaut 10"
  vérifier que maximum(3, 10) == 10
fin
