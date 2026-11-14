# RaceBob — Checkliste vor dem App Store

## Technischer Test auf dem echten iPhone

- [ ] App mit Xcode 26+ auf einem iPhone installieren; Start ohne weiße Seite.
- [ ] Ohne Internet testen: Start, vorhandene Bikes, Events, Service, Strecken und Berechnungen funktionieren.
- [ ] Neues Bike erstellen, schließen und nach Neustart wiederfinden.
- [ ] Event und Stint erstellen, bearbeiten und löschen.
- [ ] Streckenbild über Fotoauswahl hinzufügen und Kurven setzen.
- [ ] Test-Backup **mit Streckenbildern** exportieren und einspielen; vorher eigene Daten sichern.
- [ ] Sehr viele Daten/Bilder testen: `localStorage` und Zwischenablage haben Grenzen.
- [ ] Safe-Area-Layout (Notch, Home-Indikator) und Landscape/Keyboard testen.
- [ ] App-Icon auf dem Home-Bildschirm prüfen.
- [ ] Datenschutzangaben prüfen: App speichert lokal, lädt allerdings aktuell Google Fonts über das Internet.

## Vor der Veröffentlichung in App Store Connect

- [ ] Eindeutige Bundle-ID in `capacitor.config.json` und Xcode, zur eigenen Apple-Entwicklerorganisation gehörig.
- [ ] App-Name **RaceBob** und Rechte an Name, Logo und Code prüfen.
- [ ] Versionsnummer und Buildnummer in Xcode eintragen (erst `1.0.0` / `1`).
- [ ] 1024×1024-Icon generieren und im echten Build prüfen.
- [ ] Produktbeschreibung, Keywords, Support-URL und **öffentliche Datenschutzerklärung-URL** anlegen.
- [ ] Korrekte App-Datenschutzangaben aus tatsächlichem Verhalten ermitteln, besonders Google Fonts/Netzwerkverkehr und ggf. spätere Plugins.
- [ ] Aktuelle Altersfreigabe-Fragen ausfüllen und alle Inhalte prüfen.
- [ ] Aktuelle App-Store-Screenshots **auf dem Simulator/echten Gerät** erstellen; keine reinen Browser-Mockups als Screenshots.
- [ ] `Product → Archive` in Xcode, dann `Distribute App → App Store Connect`.
- [ ] TestFlight mit mindestens einem realen Gerät und verschiedenen Zuständen (frische Installation, Update, alte Sicherung) testen.
- [ ] App zur Prüfung einreichen; Apples Richtlinie 4.2 zur Mindestfunktionalität beachten.

## Nicht automatisch erledigt

Dieses Paket konnte **nicht auf macOS mit Xcode kompiliert oder signiert** werden. Es wurde weder eine IPA noch ein TestFlight-Build erstellt. Die App Store-Freigabe liegt ausschließlich bei Apple.
