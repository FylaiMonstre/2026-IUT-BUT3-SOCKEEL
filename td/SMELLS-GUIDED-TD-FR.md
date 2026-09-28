# Revue guidée — `td/Product.ts`

Ceci est la fiche de travail des étudiants. `Product.ts` contient 25 code smells
plantés volontairement. Ils sont listés ici **du plus simple au plus complexe**,
pour que vous vous fassiez la main sur des quick wins avant de vous attaquer aux
refactorings qui demandent une vraie réflexion de design. Le smell n°25 (la god
class) est l'objectif final de l'exercice : la plupart des autres sont des
marches pour y arriver.

Chaque entrée vous donne :

- **Le smell** — quel est la nature du défaut à trouver.
- **Comment le détecter** — les questions à se poser, les outils à lancer, les
  patterns à chercher (d'abord avec vos yeux et éventuellement aidé de l'IA mais les réponses toutes faites seront sous-notées).
- **Indice** — où regarder dans `Product.ts`.  
- **Attendu de votre part** —  ce que la revue de code doit pointer du doigt en 1), et en 2) ce qu'un bon fix doit accomplir, et comment vous
  allez le prouver (tests, compilation, review).

## Règles du jeu :

- `npm run build` (`tsc --noEmit`) doit rester vert après chaque fix.
- `npm test` ne doit pas devenir *pire*. Certains tests échouent volontairement
  aujourd'hui (voir la dernière section) ; une partie du travail est de les
  faire passer petit à petit.
- N'ajoutez **pas** d'assertions sur les appels Prisma ou l'état persisté — les
  tests restent en mémoire, pas de base de données à ajouter.
- Committez après chaque smell arrangé, avec un message qui nomme le smell corrigé.

---

## Niveau 1 — Quick wins (nommage, syntaxe, portée locale)

Chacun se corrige en quelques minutes. Ils vous font l'œil avant les plus durs.

### 1. Abréviations cryptiques

**Le smell.** Des identifiants tellement raccourcis que le lecteur doit
*deviner* ce qu'ils veulent dire. Les abréviations économisent quelques frappes
une fois, et coûtent une gymnastique mentale à chaque lecture, pour toujours.
Le signe qui ne trompe pas : l'incohérence. Certains noms écrits en toutes
lettres, d'autres compressés, sans règle qu'on puisse apprendre.

**Comment le détecter.** Lisez les champs d'une classe à voix haute. Si vous
hésitez sur l'un d'eux, ou si deux abréviations pourraient correspondre au même
mot, vous l'avez trouvé. Comparez aussi le nommage d'une couche à l'autre :
noms de types, noms de champs et noms de paramètres suivent-ils la même
convention ?

**Indice.** Comparez les noms de classes du fichier à leurs champs. Puis ouvrez
`Product.test.ts` et lisez les *premiers* blocs `describe` : ils attendent les
noms que le code *devrait* avoir, et ils échouent aujourd'hui avec un message
qui vous dit exactement quel nom est attendu. Servez-vous-en comme checklist.

**Attendu de votre part.** Une passe de renommage, sans changement de
comportement. Les tests de nommage en haut de `Product.test.ts` passent au
vert. Faites-le en premier — tous les autres smells deviennent plus faciles à
lire une fois que les noms sont honnêtes.

---

### 2. Variable inutilisée

**Le smell.** Une variable déclarée (ou déstructurée) et jamais lue. Les noms
morts mentent : ils laissent croire que quelque chose est utilisé alors que
rien ne l'est.

**Comment le détecter.** Le compilateur *peut* le détecter — mais encore
faut-il l'activer. Ouvrez `tsconfig.json` et regardez quelles options strictes
sont activées et lesquelles manquent. Puis lisez chaque boucle `for` et chaque
pattern de déstructuration du fichier en vous demandant, pour chaque variable
déclarée : « où est-elle lue ? »

**Indice.** Deux méthodes de `Product` itèrent sur la même `Map` de la même
façon. L'une déclare une variable qu'elle n'utilise jamais ; l'autre non.
Repérez l'incohérence entre les deux.

**Attendu de votre part.** Supprimez la variable morte. Bonus : activez
l'option du compilateur qui l'aurait détectée, et regardez ce qu'elle signale
d'autre (une partie est un autre smell de cette liste).

---

### 3. Un commentaire qui décrit le passé, pas le code

**Le smell.** Un commentaire qui explique comment le code était *avant*, ou
qui affirme qu'un problème est réglé, alors que le code en dessous a toujours
le même problème. Les commentaires pourrissent plus vite que le code.

**Comment le détecter.** Lisez d'abord le commentaire en tête de fichier, puis
lisez le code comme s'il n'existait pas. Le code tient-il vraiment ce que le
commentaire promet ? Repérez en particulier les formulations du genre
« réglé », « supprimé », « plus nécessaire ».

**Indice.** Le commentaire d'en-tête parle de garder deux représentations
synchronisées à la main. Regardez `Price` et chaque endroit où `Product`
modifie un champ de `Price` puis le persiste. Est-ce encore de la « discipline
au lieu d'une vraie contrainte » ?

**Attendu de votre part.** Soit vous rendez le commentaire vrai (en corrigeant
le code), soit vous le rendez honnête (en le réécrivant). Ne laissez pas un
commentaire qui induit le lecteur suivant en erreur.

---

### 4. Nombres magiques

**Le smell.** Un littéral numérique dont le sens ne saute pas aux yeux — et
dont la *raison* n'est consignée nulle part. Pourquoi 20 et pas 25 ? Qui l'a
décidé ? Est-ce que ça peut changer ?

**Comment le détecter.** Cherchez les littéraux numériques autres que `0`, `1`,
`100`. Pour chacun, demandez-vous : « si le métier change cette valeur, combien
d'endroits dois-je modifier, et comment les retrouver ? »

**Indice.** Cherchez un constructeur qui assigne des valeurs par défaut à deux
champs de pourcentage.

**Attendu de votre part.** Donnez à chaque nombre un nom, et un endroit où il
vit. Puis écrivez un test qui casserait si quelqu'un changeait la valeur par
défaut en douce.

---

### 5. Paramètre inutilisé

**Le smell.** Un paramètre présent dans la signature d'une méthode mais jamais
lu dans son corps. Pire qu'une variable locale inutilisée : il fait partie du
contrat public. Chaque appelant doit fournir une valeur qui ne sert à rien, et
le nom *promet* un comportement que la méthode n'offre pas.

**Comment le détecter.** Pour chaque méthode, listez les paramètres, puis
cherchez chacun dans le corps. Demandez-vous : « si je passais la valeur
inverse, est-ce que quelque chose changerait ? » Regardez aussi
`tsconfig.json` — il y a une option pour ça aussi.

**Indice.** Une méthode de la section « catalog » a un paramètre booléen dont
le nom suggère qu'il contrôle le remplacement des données existantes. Lisez le
corps et décidez si c'est le cas.

**Attendu de votre part.** À vous de trancher : soit le paramètre fait ce que
son nom annonce (et vous testez les deux valeurs), soit il saute et vous mettez
à jour les appelants. Et soyez capable de justifier votre choix en review.

---

### 6. L'assertion non-null (`!`) qui cache un vrai `null`

**Le smell.** L'opérateur `!` dit au compilateur « fais-moi confiance, ce n'est
jamais null ». Quand le type dit `T | null` et que rien en amont ne garantit
une valeur, `!` n'est pas une preuve — c'est juste un moyen de faire taire le
message d'erreur. Le crash arrive quand même, au runtime, avec un message
inutile.

**Comment le détecter.** Cherchez `!.`, `!)` et `!;`. Pour chaque occurrence,
remontez à la source de la valeur et demandez-vous : « qu'est-ce qui garantit
vraiment qu'elle n'est pas null ici ? » Si la réponse est « rien », c'est un
smell. Comparez avec les endroits du même fichier qui gèrent honnêtement le
cas null, avec un test et une erreur explicite.

**Indice.** Un champ est déclaré nullable dans le constructeur. Une méthode
accède à une de ses propriétés sans vérifier. Une autre méthode du même
fichier montre la façon honnête de gérer un collaborateur absent.

**Attendu de votre part.** Gérez le cas null explicitement, avec un résultat
qui a du sens métier. Écrivez un test qui construit un `Product` avec ce champ
`null` et qui appelle la méthode.

---

### 7. Widening de type + cast `as`

**Le smell.** Un cast (`as SomeType`) est une promesse faite au compilateur que
vous savez mieux que lui. Quand le cast n'existe que parce qu'une variable a
été déclarée d'une façon qui a perdu son type précis, il étouffe une *vraie*
erreur et désarme le type union qu'il cible : une faute de frappe dans la
chaîne passerait inaperçue.

**Comment le détecter.** Cherchez ` as `. Pour chaque cast, demandez-vous :
« pourquoi ça ne compile pas sans ? » Puis supprimez le cast et lisez
attentivement l'erreur du compilateur — elle désigne généralement la cause
première. Faites attention à `let` vs `const` et à la façon dont TypeScript
infère le type d'un littéral de chaîne.

**Indice.** Une méthode assigne un statut en deux étapes là où une méthode
voisine le fait en une. Comparez-les. Puis supprimez le cast et lisez ce que
`tsc` vous dit.

**Attendu de votre part.** Plus de cast, et un type union qui vous protège
vraiment. Prouvez-le : introduisez une faute de frappe dans la chaîne de
statut et vérifiez que le build échoue.

---

## Niveau 2 — Restructuration à l'échelle d'une méthode

Chacun de ces smells vit à l'intérieur d'une seule méthode. Vous allez
remodeler la logique sans changer ce qu'elle fait — donc écrivez ou lancez les
tests de comportement *d'abord*.

### 8. Pyramide de `if/else` au lieu de guard clauses

**Le smell.** Une indentation qui part vers la droite. Une méthode qui
pourrait dire « si X, on a fini ; si Y, on a fini ; sinon… » est plus lisible que
si on a toutes les conditions imbriquées dans un méga bloc  `if { … } else { if { … } else { … } }`.

Avoir trop de profondeur
 masque une structure qui pourrait être plus simple (pour le même résultat logique),
et cache parfois une branche qui ne fait rien du tout.

**Comment le détecter.** Cherchez les méthodes dont la ligne la plus profonde
est indentée de 3 niveaux ou plus. Comptez les issues distinctes : s'il y
a trois issues et cinq branches, certaines branches sont redondantes. Cherchez
en particulier un `if/else` dont les deux bras sont identiques.

Vous pouvez utiliser un outil, plugin pour votre IDE, ou un package intégré à la CI (linter).
Allez voir sur https://github.com/pilotpirxie/cyclomatic-complexity

**Indice.** Commencez par la méthode la plus courte de `Product` qui calcule
un libellé d'affichage. Comparez le nombre d'issues au nombre de branches.

**Attendu de votre part.** Une méthode à plat, avec des early returns et sans
branche tautologique. Les tests de comportement de `getDisplayLabel()` doivent
toujours passer, sans modification.

---

### 9. Arrow code avec des gardes redondantes

**Le smell.** Même forme que #8, avec une subtilité en plus : plusieurs des
conditions sont *toujours vraies* au vu des types, et la vraie règle métier est
répartie sur deux conditions empilées. Si l'un des checks « toujours vrais »
devenait un jour faux, la méthode ne ferait rien, en silence — pas d'erreur,
pas de résultat.

**Comment le détecter.** Pour chaque `if` de la pyramide, demandez-vous : « au
vu des types déclarés, est-ce que ça peut être faux ? » Puis : « si c'était
faux, que se passerait-il ? » Le no-op silencieux est la pire réponse
possible. Demandez-vous aussi si les deux checks numériques ne pourraient pas
n'en faire qu'un.

**Indice.** La méthode qui ajoute une remise. Comparez sa forme au style
guard clauses des méthodes de vente de stock et d'assignation de fournisseur,
dans la même classe.

**Attendu de votre part.** Des guard clauses en haut, un check par règle, et
un échec bruyant en cas de violation. Les tests existants « troisième remise »
et « date passée » doivent toujours passer. (Vous reviendrez sur cette méthode
pour #11, #12 et #15 — envisagez de tout corriger d'un coup.)

---

### 10. Getters et setters qui n'encapsulent rien

**Le smell.** Des paires `getX()`/`setX()` sur une classe dont les champs sont
déjà publics. Elles ajoutent de la cérémonie sans ajouter de protection : pas
de validation, pas de valeur calculée, pas de représentation cachée. Et si le
reste du code les contourne, vous avez deux façons de faire la même
modification.

**Comment le détecter.** Pour chaque getter/setter, posez trois questions : le
champ est-il privé ? Le setter valide-t-il quelque chose ? Est-ce que
quelqu'un appelle vraiment ces méthodes ? Trois « non », c'est un smell.
Cherchez les call sites.

**Indice.** Une petite classe value object en haut du fichier. Puis regardez
comment `Product` modifie la marge de cet objet — en passant par le setter, ou
en le contournant ?

**Attendu de votre part.** Choisissez votre camp : soit les champs sont privés
et les accesseurs *font* quelque chose (valider, au minimum), soit les
accesseurs sautent. Dans les deux cas, il ne doit rester qu'une seule façon de
modifier chaque champ.

---

### 11. Un test flaky

**Le smell.** Un des tests est flaky (instable) : il joue le même code, les mêmes entrées, mais on voit un résultat différent
d'un run à l'autre. Le coupable habituel est une dépendance à quelque chose que
le test ne contrôle pas — l'horloge système, le réseau, l'aléatoire, le timing.
Les tests flaky sont pires que pas de test : on apprend à ignorer le rouge.

**Comment le détecter.** Lancez la suite plusieurs fois de suite et regardez les
résultats.  Prenez le test qui est rouge et jouez le individuellement plusieurs fois. Il redevient vert.

Quand vous avez trouvé le test instable, résistez à l'envie de
« corriger le test ». 
Demandez plutôt : *qu'est-ce que le code testé lit que
le test ne contrôle pas ?* Puis lisez la méthode testée très attentivement, y
compris le travail préparatoire « inoffensif » qu'elle fait avant le vrai
check. 

Peut être que ce travail qui vous semble innofensif ou que vous ne comprenez pas vraiement ne sert à rien.
Essayez de le supprimer et regardez ce qui se passe. Les tests reviennent au vert ? Alors c'était lui le problème.

**Indice.** Le test qui flippe est dans le bloc `addDiscount()`. Le test
lui-même est court et a l'air innocent — la cause n'est pas dans le fichier de
test. Chronométrez l'exécution de la méthode.

**Attendu de votre part.** Deux choses : supprimez la cause dans le code de
production, OU BIEN rendez le test déterministe en contrôlant l'horloge (Vitest a
des outils pour ça). Le test doit ensuite passer 20/20 runs. Expliquez dans
votre message de commit quelle race condition se jouait, et entre quoi.

---

### 12. Variables locales promues en champs (mauvais scope de variable)

**Le smell.** Une valeur qui ne sert que le temps d'un appel de méthode est
stockée dans l'objet au lieu d'une variable locale. Elle a désormais l'air
d'un état, survit entre les appels avec des données périmées, et doit être
typée `| undefined` parce qu'il n'existe pas de valeur initiale sensée — ce
qui est en soi le signe qu'elle n'a jamais été de l'état.

**Comment le détecter.** Pour chaque champ, demandez-vous : « est-il lu par
plus d'une méthode ? Est-ce qu'il veut dire quelque chose entre deux
appels ? Est-il à sa place ? ».
 Les champs typés `| undefined` sans initialiseur méritent suspicion.
Cherchez le nom de chacun de ces champs et comptez les méthodes qui le
touchent.

**Indice.** Deux champs en bas de la liste des champs de `Product`. Chacun est
écrit puis lu à l'intérieur d'une seule méthode, à quelques lignes d'écart.

**Attendu de votre part.** Rétrogradez-les en variables locales. La liste des
champs de la classe ne devrait contenir que ce qui décrit un `Product`.

---

### 13. `Error` générique pour des violations métier

**Le smell.** `throw new Error("some message")` pour une règle métier.
L'appelant ne peut distinguer « pas assez de stock » de « la base a explosé »
qu'en comparant des chaînes avec le message — fragile, non typé, et invisible
dans les signatures.

**Comment le détecter.** Cherchez `throw new Error`. Pour chacun, demandez-
vous : « est-ce un bug, ou une règle ? » Les règles méritent leur propre type
d'erreur, pour que les appelants puissent les `catch`er de façon ciblée et que
le message puisse changer sans casser le code de qui que ce soit.

**Indice.** Plusieurs throws de ce fichier expriment des règles métier.
Groupez-les par type de règle avant de décider du nombre de classes d'erreur
dont vous avez besoin.

**Attendu de votre part.** Des classes d'erreur métier, et des tests qui
vérifient le *type* de l'erreur, pas seulement le texte du message. Gardez les
messages — ils restent utiles pour les humains.

---

## Niveau 3 — Duplication et branchements emmêlés

Ces smells s'étendent sur plusieurs méthodes, ou concernent une méthode qui a
accumulé trop de responsabilités. Vous allez extraire des choses.

### 14. Code dupliqué

**Le smell.** Le même bloc de logique apparaît à deux endroits avec une petite
variation. Chaque bug doit maintenant être corrigé deux fois, et les deux
copies vont diverger.

**Comment le détecter.** Lisez les deux méthodes de cycle de vie (`sell`,
`deprecate`) côte à côte. Surlignez ce qui est identique et ce qui diffère. Si
la différence tient aux données (deux chaînes), la structure devrait être
partagée.

**Indice.** Regardez comment chacune de ces méthodes informe les fournisseurs
régionaux. Notez qu'un helper existe déjà pour construire une notification —
la duplication est un niveau au-dessus.

**Attendu de votre part.** Un seul endroit qui sait « dire X à tous les
fournisseurs ». Les tests de comptage des notifications dans `Product.test.ts`
doivent toujours passer.

---

### 15. une promesse en l'air (promise incomplète ou flottante)

**Le smell.** Un appel `async` dont la promise retournée n'est ni awaitée ni
gérée. La méthode retourne avant que le travail soit terminé ; si le travail
échoue, personne ne rattrape l'erreur. Le compilateur ne se plaint pas — c'est
une règle de lint, pas une règle de type.

**Comment le détecter.** Pour chaque méthode `async`, vérifiez que chaque
appel à une autre fonction `async` est awaité (ou explicitement retourné /
géré). Comparez avec les méthodes voisines : si six méthodes font d'une façon
et qu'une fait différemment, regardez celle qui détonne. Envisagez d'ajouter
ESLint avec `@typescript-eslint/no-floating-promises` pour détecter cette
catégorie de bugs mécaniquement.

**Indice.** Tous les mutateurs de `Product` persistent via Prisma. L'un d'eux
n'attend pas le résultat.

**Attendu de votre part.** Le fix est minuscule. Le vrai rendu, c'est
l'explication : dans votre message de commit, décrivez ce qu'un appelant
observerait avant et après, et pourquoi la suite de tests ne l'a pas détecté.

---

### 16. Tout ce qui cloche dans `addImage()`, d'un coup

**Le smell.** Une seule méthode qui viole plusieurs règles en même temps :
imbrication profonde sans early exits, validation de chaîne bricolée au lieu
d'une vraie vérification, une boucle où c'est silencieusement la *dernière*
correspondance qui gagne, deux chemins d'erreur différents qui lancent le même
message trompeur, et des conditions formulées en négatif là où une positive se
lirait mieux.

**Comment le détecter.** Lisez `addImage()` de haut en bas et, pour chaque
ligne, nommez la règle de clean code qu'elle enfreint. Vous devriez en trouver
au moins cinq différentes. Puis regardez ses tests : tous verts — est-ce que
ça veut dire que la méthode est bonne ? Quelle entrée surprendrait l'auteur ?

**Indice.** Essayez de l'appeler avec une URL vide et lisez l'erreur. Essayez
`"HTTP://..."` en majuscules. Essayez avec deux fournisseurs éligibles et
regardez quel nom vous obtenez.

**Attendu de votre part.** Une méthode à plat avec des guard clauses en haut,
une vraie validation (la plateforme a une classe `URL` ; pour l'email, au
moins une regex), une décision explicite sur ce qui se passe avec plusieurs
fournisseurs, et des messages d'erreur honnêtes. Les neuf tests existants
passent toujours, plus un nouveau test pour le cas multi-fournisseurs qui
documente le comportement choisi.

---

### 17. Des fallbacks qui font chacun *quelque chose* — sans cohérence

**Le smell.** Chaque branche `else` a un comportement, donc rien n'a l'air
vide — mais ces comportements ne suivent aucune politique. Un enregistrement
incomplet lève une erreur ; un enregistrement incomplet autrement se dégrade
en silence ; un troisième va piocher dans un objet sans rapport pour une
valeur de remplacement. Impossible de prédire ce que la méthode fera sans
relire chaque branche.

**Comment le détecter.** Listez chaque branche de fallback et notez dans une
colonne « quelle condition » et dans l'autre « ce qui se passe ». Si la
deuxième colonne mélange « lever une erreur » et « substitution silencieuse »
pour des conditions du même genre, il n'y a pas de politique — juste des
accidents.

**Indice.** Même méthode que #16 : la boucle de matching des fournisseurs.
Notez quelle branche lit un champ qui n'a rien à voir avec les fournisseurs.

**Attendu de votre part.** Une politique explicite (dans un commentaire ou
dans le nom de la méthode), appliquée de façon cohérente. Les tests de chaque
branche doivent refléter la politique, pas l'accident.

---

### 18. Ré-implémentation de la formule d'un collaborateur

**Le smell.** La classe A calcule quelque chose en allant lire les champs de
la classe B et en y appliquant la formule de B, inline — alors que B a déjà
une méthode qui fait exactement ça. La formule vit désormais en deux
exemplaires et va diverger.

**Comment le détecter.** Quand vous voyez de l'arithmétique sur `this.x.a`,
`this.x.b`, `this.x.c`, regardez la classe `X` et vérifiez si elle sait déjà
le faire. Cherchez les méthodes qui portent le *même nom* dans deux classes.

**Indice.** Deux méthodes de ce fichier partagent un nom. Est-ce que l'une
appelle l'autre ? Vérifiez.

**Attendu de votre part.** Une formule, un propriétaire. Un test sur chaque
classe qui prouve qu'elles sont d'accord.

---

## Niveau 4 — Design et flux de données

Ici, vous allez ajouter des méthodes à *d'autres* classes et repenser la façon
dont les données circulent.

### 19. « Tell, don't ask » — fouiller dans les collaborateurs

**Le smell.** Une méthode extrait des champs bruts d'un autre objet et prend
des décisions avec, au lieu de demander à cet objet de faire le travail (ou
d'exposer la valeur *dérivée*). L'objet qui a les données devrait porter le
comportement. Symptôme : des chaînes comme `this.a.b.c`, ou `other.field`
utilisé pour construire quelque chose que `other` aurait pu construire lui-
même.

**Comment le détecter.** Pour chaque lecture `this.<collaborator>.<field>`
dans `Product`, demandez-vous : « `<collaborator>` pourrait-il répondre à une
question plutôt que de rendre un champ ? » Comptez dans combien de
collaborateurs différents `Product` va piocher. Vérifiez aussi si `Product`
contourne une méthode existante du collaborateur (voir #10).

**Indice.** Au moins quatre endroits, impliquant trois classes collaboratrices
différentes. L'un est aussi le #6. Un autre est aussi le #18.

**Attendu de votre part.** De nouvelles méthodes sur `Supplier`, `Warehouse`,
`Price` qui expriment l'intention (quoi notifier, comment se décrire, combien
coûter). `Product` ne devrait plus connaître les noms de champs de ses
collaborateurs.

---

### 20. `Map` en mémoire vs table de jointure

**Le smell.** Un champ persisté via une table de jointure, mais stocké en
mémoire dans une simple `Map`, sans code de chargement en vue. Chaque lecture
après la construction n'est correcte que si *quelqu'un d'autre* l'a remplie
correctement — et rien ici ne montre qui.

**Comment le détecter.** Suivez un champ de la construction à la persistance.
Où est-il rempli quand un `Product` vient *de* la base ? Si vous ne trouvez
pas ce code, le champ est un piège.

**Indice.** Comparez l'appel Prisma de la méthode d'assignation de fournisseur
aux appels Prisma des autres mutateurs. Table différente. Maintenant, trouvez
où cette table est *lue*.

**Attendu de votre part.** Un propriétaire clairement identifié : soit un
loader qui hydrate le champ, soit une représentation qui ne peut pas être
périmée. Notez par écrit l'invariant que vous garantissez.

---

### 21. Primitive obsession — le statut en simple `string`

**Le smell.** Un concept avec des règles (un cycle de vie avec des transitions
autorisées) représenté par une union de chaînes. Les types union bloquent les
fautes de frappe mais ne disent rien sur la *séquence* : rien n'empêche de
repasser de « deprecated » à « active », ni de vendre un produit déprécié.

**Comment le détecter.** Listez les états. Dessinez les transitions autorisées
sous forme de flèches. Puis cherchez chaque affectation du champ `status` et
chaque méthode qui devrait tenir compte du statut sans le vérifier. Essayez
d'écrire un test qui fait quelque chose d'interdit — le code vous en
empêche-t-il ?

**Indice.** Écrivez un test qui appelle `deprecate()` sur un produit puis
`sell()` sur une unité. Que se passe-t-il ? Que *devrait*-il se passer ?

**Attendu de votre part.** Un endroit où les transitions sont définies une
fois et garanties. Des tests pour chaque transition interdite.

---

## Niveau 5 — Architecture

C'est pour ces smells que l'exercice existe. Attendez-vous à créer de nouveaux
fichiers.

### 22. L'état en mémoire et la base divergent en cas d'échec

**Le smell.** On mute l'objet, puis on persiste. Si la persistance throw,
l'objet ment déjà : le stock a été « vendu » en mémoire, mais pas en base.
Pas de rollback, pas de transaction, pas de politique.

**Comment le détecter.** Pour chaque mutateur, notez l'ordre des opérations :
quelle ligne modifie la mémoire, quelle ligne écrit en base, que se passe-t-il
si la seconde throw. Puis décidez ce que l'appelant a le droit de supposer
après `await product.sell(1)` — et vérifiez si le code le garantit.

**Indice.** Tous les mutateurs de `Product` ont cette forme. Prenez `sell()`
et suivez-le à la trace.

**Attendu de votre part.** Une politique de cohérence explicite, et du code
qui la respecte. Un test qui simule une écriture qui échoue (c'est *le* cas où
mocker Prisma pour qu'il *throw* est légitime) et qui vérifie l'état de
l'objet ensuite.

---

### 23. Un tableau qui grandit indéfiniment

**Le smell.** Une collection dans laquelle on ajoute à plusieurs endroits et
qu'on ne vide nulle part. Sur un objet à longue durée de vie, c'est une fuite
mémoire ; au redémarrage, le contenu est perdu. Personne n'est responsable de
son cycle de vie.

**Comment le détecter.** Pour chaque champ tableau, cherchez les `.push(`,
puis cherchez ce qui le vide ou le persiste. Si la deuxième recherche ne
donne rien, vous l'avez trouvé.

**Indice.** Le champ notifications. Demandez-vous : qui est censé les
*envoyer*, et quand ?

**Attendu de votre part.** Un responsable du cycle de vie — quelque chose qui
les flush, les envoie ou les persiste, puis les vide. Et décidez si ce
responsable doit vraiment être `Product` (voir #24).

---

### 24. Feature envy — `Product` fabrique des notifications

**Le smell.** Une classe fait un travail qui appartient à un autre concept.
`Product` connaît les sujets des emails, les templates de corps, et une
adresse client en dur. Ce n'est pas le rôle d'un produit de savoir écrire un
email ; c'est son rôle de dire « j'ai été vendu » et de laisser autre chose
décider qui en entend parler.

**Comment le détecter.** Regardez les littéraux de chaîne d'une classe.
Appartiennent-ils à son domaine ? Regardez les helpers privés : quel
vocabulaire utilisent-ils ? Si une méthode serait tout aussi à sa place dans
une classe nommée `NotificationService`, elle est envieuse.

**Indice.** Les méthodes de cycle de vie et le helper privé en bas de
`Product`. C'est aussi là que vivent #14 et #23 — ce sont les symptômes de la
même responsabilité mal placée.

**Attendu de votre part.** Un collaborateur dédié, responsable de la
construction et de l'envoi des notifications. `Product` devrait émettre des
*faits* (« 3 unités vendues, reste 7 en stock »), pas des emails. Les tests du
nouveau collaborateur ne devraient même pas avoir besoin d'un `Product`.

---

### 25. God class — l'objectif final

**Le smell.** Une classe qui est à la fois une entité métier, son propre
repository, un système de notification, un moteur de tarification et un
registre de stock. Toutes les responsabilités du module passent par elle. Le
signe qui ne trompe pas dans ce code : `Product.test.ts` doit mocker un client
de base de données rien que pour construire un `Product` et appeler une
méthode dessus — un objet métier pur ne devrait jamais en avoir besoin.

**Comment le détecter.** Comptez les raisons pour lesquelles `Product`
pourrait changer : une règle de tarification, un schéma, un template de
notification, une politique de stock… Chacune est une raison de changer à part
entière. Puis regardez les imports en haut du fichier — que fait une entité
métier en train d'importer un client de base de données ?

**Indice.** Vous avez déjà fait l'essentiel du travail si vous avez corrigé
#19, #21, #22, #23 et #24. Reste à déplacer chaque appel `prisma.*` hors de
`Product`, vers un objet dont le rôle est la persistance, et à rendre
`Product` instanciable sans rien de tout ça.

**Attendu de votre part.** `Product.ts` ne contient plus aucun import Prisma.
La persistance vit dans un repository. Les notifications vivent dans un
service. Les transitions de statut sont définies à un seul endroit.
`Product.test.ts` ne contient plus de `vi.mock` pour Prisma, et tous les tests
de comportement passent toujours — c'est votre preuve que l'entité est
désormais indépendante. Écrivez un court README qui explique la nouvelle
architecture.

---

## À propos de `Product.test.ts`

Le fichier de test a deux parties, et c'est voulu :

- Les **tests de nommage** (en haut du fichier) testent les noms que le code
  *devrait* avoir. Ils utilisent `as any`, donc ils compilent contre le code
  abrégé actuel et échouent au runtime avec un message descriptif. Ils
  échouent tous aujourd'hui. C'est votre checklist pour le smell #1.
- Les **tests de comportement** (à partir de `// --- Domain behavior ---`)
  figent ce que chaque méthode fait réellement. Ils utilisent les noms
  actuels. Ils doivent continuer à passer du début à la fin — c'est votre
  filet de sécurité pour chaque refactoring de cette liste. L'un d'eux est
  flaky exprès (#11).

Prisma est remplacé par un stub via `vi.mock`, donc la suite tourne sans base
de données. Aucun test ne vérifie les appels Prisma. Laissez ça en l'état
jusqu'à ce que vous arriviez à #22 et #25.

## Ordre de travail suggéré

1. Niveau 1 (1 à 7) — un commit chacun, une heure au total.
2. Niveau 2 (8 à 13) — les trois smells de `addDiscount()` (9, 11, 12) se
   traitent de préférence en une seule session.
3. Niveau 3 (14 à 18) — `addImage()` (16, 17) aussi en une session.
4. Niveau 4 (19 à 21) — vous commencerez à modifier `Supplier`, `Warehouse`,
   `Price`.
5. Niveau 5 (22 à 25) — nouveaux fichiers, nouvelles classes, et la preuve
   finale : `Product` testé sans mock.
