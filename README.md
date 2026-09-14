# Météo

Application web de prévisions météo en HTML/CSS/JavaScript. Données fournies par [Open-Meteo](https://open-meteo.com/), sans clé API.

## Fonctionnalités

- Météo locale via géolocalisation du navigateur
- Recherche de villes avec suggestions et fallback Nominatim (OpenStreetMap)
- Température actuelle, ressenti, humidité, vent et direction
- Prévisions sur 5 jours
- Basculement °C / °F
- Interface responsive

## Utilisation

Clonez le dépôt puis servez-le avec un serveur web (XAMPP, VS Code Live Server...).

```bash
git clone https://github.com/YassirEssayeb/m-t-o.git
```

Avec XAMPP :

1. Copiez le dossier dans `C:\xampp\htdocs\`
2. Ouvrez `http://localhost/meteo/` dans votre navigateur

Aucune installation ni clé API n'est nécessaire. Si la géolocalisation est refusée, l'application affiche Paris par défaut.

## Structure

```
├── index.html    Page principale
├── style.css     Styles
├── script.js     Logique météo et recherche
├── config.js     URLs des API utilisées
└── README.md
```

## Technologies

- HTML5 / CSS3 (Flexbox, Grid)
- JavaScript (ES6+), API Fetch
- [Open-Meteo](https://open-meteo.com/) — météo et géocodage
- [Nominatim](https://nominatim.openstreetmap.org/) — recherche de secours et géocodage inverse

## Licence

Projet sous licence MIT — voir le fichier [LICENSE](LICENSE).