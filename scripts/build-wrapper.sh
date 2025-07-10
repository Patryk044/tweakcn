#!/bin/sh

# Ten skrypt modyfikuje import w globals.css, uruchamia build i przywraca oryginalną wartość
# Jest to rozwiązanie problemu z dyrektywami @layer bez modyfikowania pliku globals.css

# Przejdź do katalogu projektu
cd /Users/patryk/Strony\ internetowe/services/chatbot/tweakcn

# Utwórz kopię zapasową globals.css
cp app/globals.css app/globals.css.bak

# Zamień import tailwindcss na import pliku z dyrektywami
sed -i '' 's/@import "tailwindcss";/@import ".\/tailwind-directives.css";/' app/globals.css

echo "Zmodyfikowano import w globals.css na potrzeby buildu"

# Uruchom komendę npm (np. build, dev)
npm "$@"

# Przywróć oryginalną zawartość globals.css
cp app/globals.css.bak app/globals.css
rm app/globals.css.bak

echo "Przywrócono oryginalną zawartość globals.css"
