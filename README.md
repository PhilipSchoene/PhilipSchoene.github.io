# Abfahrt Hypezig

Das Klemmbrett ist der offizielle Spielstand. Der Spieler sieht auf der Website neun
per Abstimmung ausgewählte Pflichtaufgaben und alle Aktivitätsaufgaben, deren
Freigabezeit bereits erreicht ist.
Die Namen und der Ablauf der Stationen werden ihm nicht angezeigt.

Die neun Pflichtaufgaben bilden außerdem ein 3×3-Bingo. Erledigte Felder werden
angetippt und auf dem Gerät gespeichert. Eine vollständige Reihe, Spalte oder
Diagonale schaltet die Überraschung frei.

Zusätzlich gibt es genau einen Slot. Die Truppe entscheidet, wann der Spieler ihn
drehen darf. Jede Drehung wird unabhängig gezogen; direkte Wiederholungen sind
möglich. Strafbier hat eine Wahrscheinlichkeit von 2/7 (ca. 28,6 %), jedes der
anderen sechs Ergebnisse von 5/42 (ca. 11,9 %). Das gilt auch für die zusätzliche
Drehung nach „Nochmal drehen“.

Der mitgelieferte Slot hat sieben fest definierte Walzenbilder:

- 🍺🍺🍺 = **Strafbier**
- 🍺👉🍺 = **Strafbier delegieren**
- 🍻🍻🍻 = **Bier-Buddy** – eine Person auswählen, beide trinken
- 🔄🔄🔄 = **Nochmal drehen** – erneut auf Drehen tippen, das nächste Ergebnis gilt
- 👥👥👥 = **Alle außer dir trinken**
- 🎲🎲🎲 = **Random** – die Gruppe entscheidet
- 👑👑👑 = **Aufgabenboss** – jemand anderem eine Mini-Aufgabe geben

Während des Drehens erscheinen nur die sieben zugehörigen Symbole. Jede Walze
hat acht feste Flächen, eine davon wiederholt das Biersymbol.

Die drei Walzen rollen als feste 3D-Zylinder, bremsen nacheinander ab und bleiben
auf dem gezogenen Walzenbild stehen. Erst nach dem letzten Stopp erscheint der
Ergebnistext. Bild und Los bleiben auch nach einem Neuladen erhalten. Bei
aktivierter Einstellung für reduzierte Bewegung wird das Ergebnis ohne Rollen
angezeigt.

## Benutzung

1. Die veröffentlichte GitHub-Pages-Adresse an die Gruppe schicken.
2. Unter **Aufgaben** sieht er die vollständigen Texte und später freigeschaltete
   Aktivitätsaufgaben.
3. Unter **Bingo** markiert er erledigte Pflichtaufgaben. Bei einer vollständigen
   Reihe, Spalte oder Diagonale erscheint die Überraschung.
4. Unter **Slot** kann er auf Ansage der Truppe drehen.

Die Seite läuft nach dem ersten Aufruf auch offline und kann zum Startbildschirm
hinzugefügt werden. Bingo-Felder und Slot-Ergebnisse bleiben auf dem Gerät
gespeichert.

Eine Station mit Aktivitätsaufgaben braucht ihre reguläre Startzeit. Ihre Aufgaben
werden automatisch zwei Stunden vorher freigeschaltet. Ohne Startzeit bleibt die
Station verborgen. Die Stationstitel und der weitere Ablauf werden dem Spieler in der
Oberfläche nicht angezeigt.

## GitHub Pages

Der Workflow in `.github/workflows/pages.yml` veröffentlicht bei jedem Push auf
`main` ausschließlich die Website-Dateien aus dem Projektstamm. Abstimmungsdaten,
Tests und interne Dateien werden nicht in das öffentliche Paket übernommen. Im
Repository unter **Settings → Pages → Build and deployment** muss als Quelle
**GitHub Actions** gewählt sein.

## Lokale Prüfung

```sh
node tests/test-core.js
node tests/test-slot.js
```

Die Seite benötigt keinen Build-Schritt, kein Backend und keine Zugangsdaten.
