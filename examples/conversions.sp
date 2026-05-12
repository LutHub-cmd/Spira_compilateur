@langue fr

— Exemple 7 : Conversions de types

— nombre() convertit du texte en nombre
soit age_texte = "25"
soit age = nombre(age_texte)
afficher "Dans 10 ans : " + (age + 10) + " ans"

— texte() convertit un nombre en texte
soit score = 100
soit message = "Score : " + texte(score)
afficher message

— % le modulo (reste de division)
soit n = 17
si n % 2 == 0 alors
  afficher n + " est pair"
sinon
  afficher n + " est impair"
fin

— FizzBuzz avec modulo
afficher "FizzBuzz de 1 à 15 :"
soit i = 1
tantque i <= 15 répéter
  si i % 15 == 0 alors
    afficher "FizzBuzz"
  sinon
    si i % 3 == 0 alors
      afficher "Fizz"
    sinon
      si i % 5 == 0 alors
        afficher "Buzz"
      sinon
        afficher i
      fin
    fin
  fin
  i = i + 1
fin
