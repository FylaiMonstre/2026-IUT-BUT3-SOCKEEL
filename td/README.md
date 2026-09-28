# Travaux dirigés — Revue de code

Les TD se déroulent **entièrement sur GitHub**, avec le workflow industriel :
*branche → pull request → revue → corrections*. Chaque TD expose une branche
de code à revoir ; chaque **groupe** rend sa revue sous forme de **pull
request** sur le dépôt du cours.

## 1. Organisation : le travail se fait par groupes

- Les étudiants se regroupent (taille fixée par l'enseignant, ex. 2-3).
- Chaque groupe désigne un **porteur** : c'est lui qui **forke** le dépôt.
- **Un fork et une PR par groupe.** Les membres rejoignent le fork du porteur
  comme collaborateurs (voir étapes ci-dessous).

## 2. Consignes de nommage — le préfixe

Tout le rendu du groupe porte le préfixe
**`<année>-<etablissement>-<groupe>`**, où `groupe` est le **nom de famille
du porteur** (sans accent, en majuscules) :

| Élément | Format | Exemple |
|---------|--------|---------|
| Préfixe | `2026-IUT-BUT3-DUPONT` | — |
| Branche | `<préfixe>-td<N>` | `2026-IUT-BUT3-DUPONT-td1` |
| Titre de PR | `<préfixe> — TD<N> — revue de <fichiers>` | `2026-IUT-BUT3-DUPONT — TD1 — revue de cart.ts` |

Le préfixe permet à l'enseignant d'identifier immédiatement le groupe, la
promotion et l'année dans la liste des PR.

## 3. La fiche `ETUDIANTS.md` (obligatoire, notée)

Le fichier **`ETUDIANTS.md`** est fourni à la racine du dépôt. Il doit être
**rempli et présent dans la PR** :

- membres du groupe (nom d'état civil + pseudo GitHub) ;
- rôle de chacun (porteur / membre) ;
- TD et lien de la PR.

La section **Note** est réservée à l'enseignant. Un `ETUDIANTS.md` absent ou
incomplet rend le rendu incomplet.

## 4. Déroulé précis (fork + PR), étape par étape

### Étape 1 — Le porteur forke le dépôt

Sur github.com, ouvrir `IUT-BUT3-2026/revues-de-code` → bouton **Fork**
(en haut à droite).

### Étape 2 — Le porteur ajoute les membres au fork

Fork → **Settings** → **Collaborators** → ajouter le pseudo GitHub de chaque
membre. Chaque membre accepte l'invitation reçue par email. Tous les membres
peuvent ensuite travailler sur le même fork.

### Étape 3 — Cloner et créer la branche préfixée

```sh
git clone https://github.com/<porteur>/revues-de-code.git
cd revues-de-code
git fetch origin
git checkout -b 2026-IUT-BUT3-DUPONT-td1 origin/td1
```

(remplacer `2026-IUT-BUT3-DUPONT` par le préfixe du groupe)

### Étape 4 — Remplir `ETUDIANTS.md`

Ouvrir `ETUDIANTS.md` (à la racine), renseigner le préfixe, le porteur, les
membres, et le TD. Ne pas toucher à la section Note.

```sh
git add ETUDIANTS.md
git commit -m "ETUDIANTS : identification du groupe"
```

### Étape 5 — Ouvrir la pull request

github.com → le fork du groupe → onglet **Pull requests** → **New pull
request** :

- **base :** la branche principale du dépôt du cours
  (`IUT-BUT3-2026/revues-de-code`, branche `main`)
- **compare :** `2026-IUT-BUT3-DUPONT-td1` (depuis le fork du groupe)
- **titre :** `2026-IUT-BUT3-DUPONT — TD1 — revue de cart.ts`
- **corps :** compléter le modèle fourni automatiquement

Le diff de la PR doit montrer : `ETUDIANTS.md` modifié + les fichiers du TD.

### Étape 6 — Annoter le code (la revue)

Sur l'onglet **Files changed** de la PR : cliquer sur une ligne pour la
commenter. **Un commentaire = un problème**, avec le *pourquoi*. Minimum par
TD indiqué dans l'énoncé (ex. 5 problèmes).

### Étape 7 — Corriger, vérifier les tests et pousser

Depuis td/:

cd td



 Corriger au moins le nombre de problèmes exigé, puis :

 #### AVANT DE COMMITER

faire tourner les tests localement:

```sh
 npm test
```

ou

```sh
npx vitest run
```

vérifier la couverture de code (ne doit pas diminuer entre 2 PR )

```
npx vitest run --coverage --coverage.reportOnFailure
```

Points clés :
- --coverage nécessite le package @vitest/coverage-v8 (déjà ajouté en devDependency dans td/package.json).
- --coverage.reportOnFailure est indispensable ici : sur vitest 5.0.0, si des tests échouent, le tableau de couverture ne s'affiche pas du tout sans ce flag.

Si tu veux juste le résumé texte (sans le détail par ligne) :

npx vitest run --coverage --coverage.reportOnFailure --coverage.reporter=text



```sh
git add .
git commit -m "TD1 : corrections proposées"
git push origin 2026-IUT-BUT3-DUPONT-td1
```

La PR se met à jour automatiquement à chaque push.

### Étape 8 — Rendre

- Laisser la PR **ouverte** (c'est le rendu).
- Coller le **lien de la PR** dans la section « Rendu » de `ETUDIANTS.md`,
  commit et push.
- Déposer le lien également à l'endroit indiqué par l'enseignant (Moodle…).

## 5. Consignes de revue (chaque TD)

- Appliquer la [checklist de revue](../templates/checklist-revue.md).
- **Attitudes du Module 1** : sur le code, pas sur la personne ; expliquer le
  *pourquoi* ; suggérer, ne pas imposer.
- L'enseignant note **à la main** chaque PR ; la qualité de la revue (pas
  seulement les corrections) compte dans la note.

## 6. Suivi des rendus (côté enseignant)

```sh
scripts/check-submissions.sh            # PR ouvertes = groupes ayant rendu
```

**Saisie des notes :** dans la PR du groupe, ouvrir `ETUDIANTS.md` (onglet
*Files changed*) et cliquer sur l'icône crayon ✏️ pour éditer le fichier sur
la branche de la PR : remplir la section **Note** (note /20 + remarques par
étudiant) et valider. Le commit de note fait partie de la PR — l'étudiant
voit sa note en se connectant. (Alternative : déposer la note en commentaire
de revue de la PR.)

## 7. Grille de notation (évaluation manuelle)

| Critère | Points |
|---------|--------|
| Commentaires pertinents (vrai problème identifié) | /4 |
| Commentaires justifiés (le *pourquoi* est expliqué) | /3 |
| Corrections proposées (réelles, pas cosmétiques) | /4 |
| Ton constructif (sur le code, suggestions) | /2 |
| Complétude (checklist couverte, cas limites vus) | /3 |
| Corps de PR clair (contexte, choix, difficultés) | /2 |
| `ETUDIANTS.md` complet (membres, lien) | /2 |

La note de chaque membre est reportée dans `ETUDIANTS.md` (section Note).

Les énoncés de chaque TD vivent sur leur branche (`td1/README.md`, `td2/…`).
