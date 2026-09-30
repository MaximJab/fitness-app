# Fitness-App

Web-App für Kettlebell-Training (später auch andere Übungen). Läuft als statische Seite über GitHub Pages und lässt sich auf dem iPhone über Safari → Teilen → „Zum Home-Bildschirm“ wie eine App installieren.

## Funktionen (erster Entwurf)
- Benutzerprofile (mehrere pro Gerät)
- Übungsdatenbank mit 3D-Animation, Filter nach Muskelgruppe und aktuellem Kettlebell-Gewicht
- Übungen per „+“ ins Workout übernehmen
- Pro Satz Gewicht und Wiederholungen eintragen, Training speichern (Verlauf)
- Workouts als Vorlage speichern und wieder laden
- Anzeige der benötigten Kettlebells im Workout, abgeglichen mit „Meine Kettlebells“
- Export/Import als JSON-Sicherung

## Datenspeicherung
GitHub Pages liefert nur Dateien aus. Profile und Trainingsdaten liegen deshalb im Browser des Geräts (localStorage, Schlüssel `fitapp.v1`). Keine Synchronisation zwischen Geräten.

## Aufbau
| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst, Navigation |
| `app.css` | Gestaltung |
| `app.js` | Profile, Übungsliste, Workout, Verlauf, Speicherung |
| `engine.js` | 3D-Modell und Animations-Engine (three.js r128) |
| `exercises.js` | Übungsdatenbank |
| `sw.js` | Offline-Cache (bei Änderungen `VERSION` erhöhen) |

## Neue Übungen ergänzen
In `exercises.js` per `EX.push({...})`. Pflichtfelder: `id` (eindeutig, nie wieder ändern), `name`, `group`, `level`, `muscles`, `volume` (z. B. `'3 × 10'`), `steps`, `mistake`. Für Übungen ohne Kettlebell `type:'bodyweight'` o. ä. setzen. Animation (`keys` usw.) ist optional; ohne `keys` zeigt die App nur die Beschreibung.
