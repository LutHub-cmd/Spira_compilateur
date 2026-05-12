@langue fr

— Module maths.sp
faire est_pair avec n
  donner n % 2 == 0
fin

faire puissance avec base, exposant
  soit résultat = 1
  soit i = 0
  tantque i < exposant répéter
    résultat *= base
    i += 1
  fin
  donner résultat
fin

faire maximum avec a, b
  si a >= b alors
    donner a
  sinon
    donner b
  fin
fin
