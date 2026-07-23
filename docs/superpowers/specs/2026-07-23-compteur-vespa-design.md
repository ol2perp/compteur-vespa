# Compteur Vespa — Design (V1)

Date : 2026-07-23
Statut : validé (brainstorming)

## 1. Objectif

PWA (application web installable) reproduisant le compteur ovale vintage d'une
Vespa, à monter sur le guidon et utiliser en roulant. Clone/adaptation de
*Bike Tracker* pour le scooter. Affichage **paysage uniquement**, plein écran,
tout en local sur le téléphone (aucun serveur, aucune donnée envoyée ailleurs).

## 2. Périmètre

### Dans la V1
- **Vitesse réelle** (GPS) + **jauge visuelle** qui se remplit 0→120 le long de
  l'échelle du cadran.
- **Vitesse moyenne** (globale : distance ÷ temps total depuis le départ, arrêts
  inclus).
- **Km journalier** (avec reset) et **km total** (démarre à 388, persistant,
  modifiable à la main).
- **Timer** : heure, date, temps écoulé depuis le départ, distinction temps
  roulant / temps d'arrêt.
- **Consommation** : L/100 instantané (affichage) + **km restants avant panne
  sèche**, via un modèle **auto-calibrant**.
- **Switch 1/2 personnes** (passager +70 kg → surcoût de conso).

### Reporté (V2+)
- **Météo géolocalisée** (actuelle + 2 h : température, vent, pluie). Le cadran 3
  lui est réservé (grisé en V1).

## 3. Choix techniques

- **Type** : PWA (pas d'app native → pas de Mac/Xcode/compte développeur requis).
- **Stack** : Vanilla JS + SVG, sans framework. Build optionnel léger (Vite)
  uniquement pour le service worker / manifest.
- **Rendu** : le fichier `Compteur-SVG.svg` (fourni, viewBox `0 0 1218 562.5`,
  groupes nommés) sert d'asset de production. La jauge et les cadrans sont
  dessinés/animés par-dessus en SVG.
- **Hébergement** : GitHub Pages (HTTPS gratuit — **obligatoire** pour la
  géolocalisation et le service worker). Push → en ligne → « Ajouter à l'écran
  d'accueil » sur l'iPhone.
- **Écran** : Wake Lock API pour empêcher l'extinction en roulant ; verrouillage
  en orientation paysage.

## 4. Architecture & modules

Chaque module a une responsabilité unique ; `geo`, `trip` et `fuel` sont de la
logique pure (sans DOM), donc testables avec des traces GPS simulées.

| Module | Rôle | Dépend de |
|--------|------|-----------|
| `geo.js` | Wrapper GPS : émet `{vitesse, lat, lon, précision, t}`, lisse le bruit, calcule les distances | API Geolocation |
| `trip.js` | Compteurs : km jour, km total, temps roulant/arrêt, vitesse moyenne | `geo` |
| `fuel.js` | Modèle conso : niveau réservoir, L/100 calibré + instantané, km avant panne, Plein/Réserve, facteur passager | `geo`, `trip` |
| `store.js` | Persistance locale (localStorage), versionnée | — |
| `gauge.js` | Rendu SVG de la jauge (remplissage 0→vitesse le long du path `Jauge`) | — |
| `dials.js` | Rendu des 4 cadrans | — |
| `app.js` | Orchestration : boucle de rendu (~4×/s), machine à états (arrêt/roulant), Wake Lock, montage | tous |
| `sw.js` + `manifest.webmanifest` | Service worker (cache app, offline) + install écran d'accueil, plein écran paysage | — |

**Flux de données** : `geo` (GPS) → alimente `trip` (distances, temps) et `fuel`
(conso) → `app` lit l'état et redessine `gauge` + `dials`. `store` sauvegarde en
continu.

## 5. Géométrie (depuis Compteur-SVG.svg)

viewBox : `0 0 1218 562.5`. Ronds (ellipses, rayon 72.2) :

| Cadran (groupe SVG) | Centre (x, y) | Contenu |
|---------------------|---------------|---------|
| `Cadran_CONSO` | 363.9, 339.1 | vitesse moyenne · km avant panne + ⛽ · L/100 |
| `Cadran-HEURES` | 516.6, 386 | heure · date · temps écoulé |
| `Cabdran-METEO` | 679, 386 | **réservé V2** (grisé) |
| `Cadran-KM` | 833.7, 338.8 | km jour · reset · km total |

Jauge (`#Jauge`) : path `M224.9,235.6 c79.3-58.5,199.7-131.2,371.4-131.2 s321.6,84.1,393.6,133.3`.
Le remplissage se fait par `stroke-dasharray`/`stroke-dashoffset` le long de ce
path, proportionnel à `vitesse / 120`.

Groupes du fond : `BG_xA0_Image` (image), `Chiffres-Blancs`, `Chiffres-Noirs`.

## 6. Interface

- **Machine à états visuelle** :
  - *Arrêt* : échelle 0→120 inactive, cadrans affichent les données.
  - *Roulant* : la jauge se remplit en blanc jusqu'à la vitesse courante.
- **Cadran 3 (Météo)** : grisé/réservé en V1.
- **Menu réglages ⚙** (coin, accessible à l'arrêt) regroupe :
  - bouton **Plein** (→ réservoir = 7,7 L),
  - **Réserve** (voyant allumé → resync + calibration),
  - **switch 1/2 personnes**,
  - réglages manuels : km total (init. 388), conso calibrée, surcoût passager.
- **Reset km journalier** : sur le cadran KM (bande « reset »).

## 7. Modèle de consommation (auto-calibrant)

### Réservoir simulé
- `niveauReservoir` (litres, 0 → 7,7). Bouton **Plein** → 7,7 L.
- À chaque Δd, on retranche `L/100_instantané ÷ 100 × Δd`.
- Seuil **réserve** = 1,4 L → alerte visuelle (icône pompe en alerte).

### L/100 instantané (affichage temps réel) = base × facteurs
- **Vitesse** : courbe en U (optimal ~60-80 km/h, plus gourmand en dessous et au-dessus).
- **Accélération** : forte accél / démarrage → surconsommation ; ralenti (arrêté
  moteur tournant) → petit débit fixe.
- **Passager** : switch 1/2 pers. → surcoût fixe paramétrable (**défaut +10 %**).

### Apprentissage (cycle Plein → Réserve)
- Tap **Plein** (note le km) puis **Réserve** quand le voyant s'allume (note le km).
- Carburant réellement brûlé = 7,7 − 1,4 = **6,3 L** sur la distance mesurée
  → `conso réelle = 6,3 ÷ distance × 100`.
- Met à jour la **conso calibrée** (lissage sur plusieurs cycles) et
  **resynchronise** `niveauReservoir` à 1,4 L (corrige la dérive à chaque plein).
- Calibration effectuée sur la **base solo** ; le passager applique le surcoût fixe.

### Km avant panne sèche
Utilise la **conso calibrée** (stable), pas l'instantanée (bruitée) :
`km restants = niveauReservoir ÷ conso_calibrée × 100`.

## 8. Robustesse & cas limites

**GPS** (`geo.js`) :
- Filtrage précision : ignorer les points `accuracy > 30 m`.
- Anti-jitter à l'arrêt : sous **3 km/h** → « arrêté », distance figée, temps
  basculé en « temps d'arrêt ».
- Vitesse : `coords.speed` en priorité, sinon calculée par distance/temps ;
  léger lissage (moyenne glissante courte).
- Rejet des sauts impossibles (> ~130 km/h).

**Persistance & pannes** :
- Sauvegarde continue (km total, réservoir, calibration, trajet en cours).
- Perte GPS en roulant → figer la dernière vitesse quelques secondes puis
  afficher « GPS ? ».
- Refus permission GPS → écran d'explication.
- Wake Lock refusé → avertissement (l'écran peut s'éteindre).

**Réservoir & calibration — garde-fous** :
- Le tap « Réserve » resynchronise même si un « Plein » a été oublié.
- Rejet des cycles de calibration aberrants (distance trop courte, valeurs absurdes).
- Toutes les valeurs restent modifiables à la main dans ⚙.

## 9. Tests (TDD sur la logique pure)

- `fuel.js` : calibration (plein→réserve → L/100), km avant panne, resync, rejet
  des cycles aberrants.
- `trip.js` : intégration de distance sur trace GPS simulée, temps roulant/arrêt,
  vitesse moyenne globale.
- `geo.js` : filtrage précision, seuil arrêt, rejet des sauts.
- Traces GPS simulées (tableaux de points) → tests rapides, sans navigateur ni
  vrai GPS.

## 10. Constantes de référence

- Réservoir : **7,7 L** dont **1,4 L** de réserve.
- Conso de base : **6 L/100** (4ᵉ à 80 km/h).
- Poids : solo ~95 kg (scooter 90 kg à vide + 5 kg essence + ~10 kg coffre +
  pilote) ; passager **+70 kg**.
- Km total initial : **388**.
- Surcoût passager par défaut : **+10 %**.
