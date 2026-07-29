# A-1 — Ce que doivent contenir V_1-MAIN.svg et V_1-REGLAGES.svg

## V_1-MAIN.svg (remplace le cadran principal)

- **Format** : viewBox actuel `1218 x 562.5` (ratio ≈ 2,165). Tu peux changer la taille tant que le ratio largeur/hauteur reste proche — l'appli étire le SVG pour remplir l'écran en respectant les proportions.
- **Fond** (chrome, cadran, logo Vespa) : libre, aucune contrainte de nom. C'est ce que je viens de basculer en bleu (V_1-Compteur-BG.png) en attendant ton fichier définitif.
- **Un tracé nommé exactement `Jauge`** : l'arc de vitesse (0→120 km/h). Un seul tracé continu — l'appli anime son remplissage progressif le long de ce tracé selon la vitesse réelle. La forme est libre, seul le nom (`id="Jauge"`) compte.
- **4 groupes nommés exactement** (respecter la casse) :

  | Nom du groupe | Centre actuel (% largeur / % hauteur) | Contenu affiché par l'appli |
  |---|---|---|
  | `Cadran_CONSO` | 29,9% / 60,3% | vitesse moyenne, km restants, conso L/100 |
  | `Cadran-HEURES` | 42,4% / 68,6% | heure, date, chrono trajet |
  | `Cabdran-METEO` | 55,7% / 68,6% | grisé "Météo · V2" (pas actif en V1) |
  | `Cadran-KM` | 68,4% / 60,2% | km du jour, reset, km total |

  Chaque groupe doit contenir **une ellipse claire** (le disque blanc sur lequel les chiffres s'affichent). Le texte/images d'exemple à l'intérieur seront supprimés automatiquement par mon script (l'appli affiche les vraies valeurs en HTML par-dessus) — tu peux donc dessiner ces cadrans avec n'importe quel contenu d'exemple, seule l'ellipse est conservée.
  Diamètre des cadrans ≈ 11,8% de la largeur totale (cercle, ratio 1:1).

  Note : le nom `Cabdran-METEO` garde volontairement la coquille d'origine — si tu préfères le corriger en `Cadran-METEO`, dis-le-moi, j'ajuste le script en même temps.

- **Si tu déplaces/redimensionnes les 4 cadrans** dans le nouveau design : donne-moi juste les nouvelles positions en % et je mets à jour le code (`dials.js`) en conséquence — pas bloquant, juste à me signaler.

## V_1-REGLAGES.svg (écran Réglages)

Contrairement à MAIN, l'écran Réglages actuel **n'est pas un SVG chargé par l'appli** : c'est un panneau HTML/CSS plein écran (fond sombre, boutons empilés : Plein / Réserve / Nouveau trajet / case Passager / champ Km total / champ Conso calibrée / Fermer).

→ Envoie ton SVG comme **maquette visuelle** (couleurs, style des boutons, mise en page) et je retranscris ça en CSS dans le panneau existant. Aucune contrainte de nommage ici, juste besoin d'un visuel clair pour la charte (couleurs bleu Vespa, style des boutons, etc.).

## Ce qui ne doit pas changer (sauf si tu me préviens)

- `id="Jauge"` sur le tracé de vitesse
- Les 4 noms de groupes de cadrans ci-dessus
