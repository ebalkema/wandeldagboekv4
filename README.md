# Wandeldagboek

Een Progressive Web App (PWA) voor het vastleggen van wandelingen en natuurobservaties met spraakherkenning.

## Functionaliteiten

- Authenticatie (email/wachtwoord en Google login)
- Wandelingen starten, opnemen en beëindigen via spraakcommando's
- Spraakgestuurd toevoegen van observaties tijdens wandelingen
- Automatisch vastleggen van locatie, weer en tijd bij observaties
- Visualisatie van wandelroutes op OpenStreetMap
- Offline functionaliteit via service workers
- Foto's toevoegen aan observaties
- Categorisatie van observaties (vogels, planten, etc.)

## Technologieën

- React met Vite als build tool
- Tailwind CSS voor styling
- Firebase (Firestore) voor de backend en authenticatie
- OpenStreetMap via Leaflet.js voor kaartfunctionaliteiten
- Web Speech API voor spraakherkenning en commando's
- PWA voor installatie op mobiele apparaten

## Installatie

1. Clone de repository:
```bash
git clone https://github.com/yourusername/wandeldagboek.git
cd wandeldagboek
```

2. Installeer de afhankelijkheden:
```bash
npm install
```

3. Maak een Firebase project aan en voeg de configuratie toe aan `src/firebase.js`.

4. Start de ontwikkelingsserver:
```bash
npm run dev
```

5. Bouw de applicatie voor productie:
```bash
npm run build
```

## Gebruik

1. Maak een account aan of log in met Google
2. Start een nieuwe wandeling via de knop of met het spraakcommando "Start wandeling"
3. Voeg observaties toe tijdens je wandeling met de observatieknop of het commando "Nieuwe observatie"
4. Bekijk je wandelingen en observaties in het dashboard

## Spraakcommando's

- "Start wandeling" - Start een nieuwe wandeling
- "Nieuwe observatie" - Voeg een observatie toe
- "Beëindig wandeling" - Stop de huidige wandeling

## Licentie

MIT 