# PVGIS Proxy Next.js

Ce mini-projet Next.js expose une route `/api/pvgis` qui sert de proxy vers l’API PVGIS pour contourner le CORS.

## Utilisation

Déployer ce dossier sur Vercel (https://vercel.com/). Ensuite, appeler :

```
https://<ton-projet-vercel>.vercel.app/api/pvgis?lat=...&lon=...&puissance=...&angle=...&azimut=...
```

## Exemple d’appel

```
https://<ton-projet-vercel>.vercel.app/api/pvgis?lat=48.85&lon=2.35&puissance=3&angle=30&azimut=0
```

## Dépendances
- next
- react
- react-dom
- axios

Aucun front-end, juste l’API route.
