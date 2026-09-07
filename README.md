# GHOSTBET — Football Intelligence

Application française de calendriers et résultats football. Interface web et code partagé pour Android/iOS via Capacitor. Aucun conseil de pari, bookmaker, mise ou modèle prédictif.

## Fonctionnalités réalisées

- Source réelle : [OpenFootball / football.json](https://github.com/openfootball/football.json), [CC0](https://github.com/openfootball/football.json/blob/master/LICENSE.md), accès public sans clé.
- Ligue 1, Premier League, LaLiga, Serie A, Bundesliga ; saisons 2026–27, 2025–26, 2024–25.
- Filtres championnat/saison/état, recherche avec noms ou sigles, pagination, favoris locaux, thème clair/sombre.
- Scores publiés et calendriers ; comparaison calculée sur les cinq derniers résultats antérieurs au match sélectionné, avec détail des matchs utilisés.
- Gestion des pannes et sources partielles ; aucun retour silencieux à des données fictives.
- Provenance, heure de récupération et limites affichées dans l’interface.

## Limites explicites

La source est communautaire, sans garantie de fraîcheur ni de disponibilité. Pas de scores en direct, notifications, coupes, compositions, blessures, possession, compte utilisateur ni administration multi-utilisateur. La date affichée est celle du fichier source ; les heures ne sont pas affichées faute de garantie sur leur fuseau. La date de récupération n’est pas la date de dernière mise à jour du fournisseur.

Les totaux de forme peuvent porter sur moins de cinq matchs ; l’effectif de l’échantillon est affiché. Les deux équipes ne doivent pas être considérées comme équivalentes lorsque leurs historiques diffèrent en longueur. Les favoris restent uniquement sur l’appareil. Le navigateur contacte GitHub directement.

## Développement et vérification

Node 22.13+ et pnpm. Conserver le fichier de verrouillage et la politique de sécurité des dépendances.

```sh
pnpm install
pnpm dev
pnpm test
pnpm exec tsc --noEmit
pnpm exec oxlint app lib/football.ts mobile
pnpm build
node --experimental-strip-types scripts/check-live-data.mjs
```

Six tests couvrent les données invalides, 0–0, résultats absents/futurs, reports, calcul temporel, historique absent, panne partielle et panne totale. Le contrôle réseau a trouvé 1 752 rencontres et 92 scores sur les cinq fichiers 2026–27 le 4 septembre 2026 ; ces nombres évoluent avec la source. Les compilations web et du contenu mobile sont vérifiées. Pas de test d’interaction dans un navigateur ni de test sur appareil physique.

L’outil optionnel WebMCP `show_football_league` utilise les filtres de l’interface. Son contrat n’a pas été testé dans un contexte WebMCP compatible. Son absence ne bloque pas l’application.

## Android

Le projet `android/` est créé et synchronisé. Identifiant de travail : `cd.ghostbet.football`, Android minimum API 24, cible/compilation API 36. Le contenu web est embarqué localement, sans dépendance au site Sites privé. Seuls les fichiers publics OpenFootball nécessitent Internet. Les sauvegardes Android automatiques sont désactivées.

```sh
pnpm build:mobile
pnpm exec cap sync android
cd android
# Windows : gradlew.bat ; macOS/Linux : ./gradlew
./gradlew assembleDebug
```

L’APK attendu après une compilation réussie se trouve dans `android/app/build/outputs/apk/debug/app-debug.apk`. **Aucun APK n’a été produit dans cet environnement.** Le SDK Manager a été bloqué par le contrôle d’application Windows lors du chargement de `lib-downloader_jni-*.dll`. La protection n’a pas été désactivée ni contournée. Un environnement autorisé avec JDK 21, Android SDK 36 et build-tools 36.0.0 est nécessaire pour terminer.

Les téléchargements JDK/SDK ont été vérifiés avec les empreintes officielles. Les outils sont stockés hors du projet dans le cache local. L’utilisateur a explicitement autorisé l’installation Android et l’acceptation de la licence SDK. Le blocage Windows reste distinct de cette autorisation.

L’APK debug est uniquement destiné aux essais. Une publication Play Store exige notamment une signature de production, un identifiant confirmé, les éléments de confidentialité et des tests. Aucun certificat de production ni compte Play Console n’est fourni.

## iOS

Projet Xcode créé dans `ios/App/`, dépendances Swift Package Manager et contenu web synchronisés. **Pas d’IPA produit.** La compilation iOS nécessite macOS et Xcode 26+, puis une configuration de signature adaptée à la distribution. Le poste actuel est Windows ; le travail iOS s’arrête au projet source.

```sh
pnpm build:mobile
pnpm exec cap sync ios
pnpm exec cap open ios
```

Confirmer l’identifiant et l’équipe de signature, effectuer les tests sur appareil et préparer les déclarations de confidentialité avant distribution. Les deux projets natifs sont des bases de développement, pas une preuve de validation par les boutiques.

## Hébergement

Le site existant reste privé : https://ghostbet-football.mr-kalemba01.chatgpt.site . La configuration Sites est conservée dans `.openai/hosting.json`. Aucun secret API n’est requis par cette version.
