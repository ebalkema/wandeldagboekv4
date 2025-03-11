# CORS-configuratie voor Firebase Storage

Om CORS-problemen op te lossen bij het uploaden van foto's naar Firebase Storage, moet je de CORS-configuratie handmatig instellen via de Google Cloud Console.

## Stappen

1. Ga naar de [Google Cloud Console](https://console.cloud.google.com/)
2. Selecteer je project: `wandeldagboekv3`
3. Ga naar "Storage" in het menu
4. Klik op "Instellingen" of "Settings"
5. Ga naar het tabblad "CORS-configuratie" of "CORS Configuration"
6. Voeg de volgende configuratie toe:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Content-Disposition", "Content-Length"]
  }
]
```

7. Klik op "Opslaan" of "Save"

## Alternatieve methode via gsutil

Als je gsutil hebt geïnstalleerd, kun je de volgende commando's gebruiken:

1. Maak een bestand `cors.json` met de bovenstaande configuratie
2. Voer het volgende commando uit:

```bash
gsutil cors set cors.json gs://wandeldagboekv3.appspot.com
```

## Testen

Na het instellen van de CORS-configuratie, kun je de app opnieuw testen om te controleren of het uploaden van foto's nu werkt. 