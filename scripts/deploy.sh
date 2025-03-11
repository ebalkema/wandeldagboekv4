#!/bin/bash

# Script om de app te bouwen en te implementeren op Firebase Hosting
# Dit script verhoogt automatisch het buildnummer

echo "🚀 Start deployment proces..."

# Controleer of er wijzigingen zijn
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Er zijn niet-gecommitte wijzigingen. Wil je doorgaan? (j/n)"
  read answer
  if [ "$answer" != "j" ]; then
    echo "❌ Deployment geannuleerd."
    exit 1
  fi
fi

# Bouw de app (dit verhoogt ook het buildnummer)
echo "🔨 App bouwen..."
npm run build

# Controleer of de build succesvol was
if [ $? -ne 0 ]; then
  echo "❌ Build mislukt. Deployment geannuleerd."
  exit 1
fi

# Implementeer op Firebase Hosting
echo "🔥 Implementeren op Firebase Hosting..."
firebase deploy --only hosting

# Controleer of de deployment succesvol was
if [ $? -ne 0 ]; then
  echo "❌ Deployment mislukt."
  exit 1
fi

# Toon het buildnummer
BUILD_NUMBER=$(grep -o '"buildNumber": [0-9]*' package.json | grep -o '[0-9]*')
VERSION=$(grep -o '"version": "[^"]*"' package.json | grep -o '"[^"]*"' | sed 's/"//g')

echo "✅ Deployment succesvol!"
echo "📦 Versie: $VERSION (build $BUILD_NUMBER)"
echo "🌐 App beschikbaar op: https://wandeldagboekv3.web.app"

# Vraag of de wijzigingen moeten worden gecommit
echo "📝 Wil je de wijzigingen committen? (j/n)"
read answer
if [ "$answer" == "j" ]; then
  git add package.json src/version.js
  git commit -m "Verhoog buildnummer naar $BUILD_NUMBER"
  echo "✅ Wijzigingen gecommit."
  
  echo "🔄 Wil je de wijzigingen pushen naar de remote repository? (j/n)"
  read push_answer
  if [ "$push_answer" == "j" ]; then
    git push
    echo "✅ Wijzigingen gepusht."
  fi
fi

echo "🎉 Deployment proces voltooid!" 