# RaceBob — VS Code & iOS (App Store)

Dieses Projekt ist die **bestehende Claude-/Trackbook-App als editierbares VS-Code-Projekt**. Die vorhandene Benutzeroberfläche und JavaScript-Funktionalität wurden **nicht neu geschrieben**, sondern in getrennte Dateien übertragen. Mit **Capacitor 8** kann sie als iOS-App in Xcode gebaut werden.

**Wichtig:** Das hier ist der **Quellcode**, noch keine signierte iPhone-App oder IPA. Der native iOS-Ordner wird beim ersten Start auf deinem Mac angelegt. Für die Veröffentlichung ist anschließend ein echter Test auf dem iPhone und die Apple-Freigabe nötig.

## 1. Ordner in VS Code öffnen

ZIP entpacken und in VS Code: **Datei → Ordner öffnen → RaceBob-VSCode**.

## 2. Vorschau im Browser (Mac)

Voraussetzung: Node.js **22 oder neuer**.

```bash
npm run dev
```

Adresse im Browser öffnen: `http://localhost:4173`

Das geht ohne `npm install`, weil die Vorschau ausschließlich Node.js benutzt. Lokale Daten werden pro Browser/Website gespeichert; sie sind nicht automatisch mit denen der iPhone-App identisch.

## 3. Erste iPhone-App erzeugen (Mac)

Voraussetzungen: Xcode **26 oder neuer**, Node.js **22 oder neuer**, Apple-Developer-Account und Internetzugang beim Installieren.

```bash
npm install
npm run check
npm run ios:init
npm run icons
npm run ios:open
```

Die iOS-Plattform wird mit **Swift Package Manager (SPM)** erstellt; daher ist für dieses Projekt normalerweise **kein CocoaPods** nötig. Nach `ios:init` wird der Ordner `ios/` erzeugt; die Xcode-Projektdatei dort bearbeiten, nicht das HTML in Xcode umschreiben.

In Xcode:

1. Links das **App-Projekt** auswählen; unter **Signing & Capabilities** dein Developer-**Team** auswählen.
2. Unter **General** die **Bundle Identifier** auf eine **eindeutige ID** setzen (Ausgangswert `de.racebob.app`, möglicherweise schon vergeben). Bevor du veröffentlichst, prüfe, dass sie im Apple-Developer-Account auf dich registriert werden kann. Die `appId` in `capacitor.config.json` passend dazu setzen, am besten **vor** `ios:init`.
3. Als Ziel dein iPhone wählen und **Run ▶** drücken.
4. Bilderauswahl, Daten speichern, Streckenbilder und Backup auf dem Gerät testen.

Sollte `npm run icons` scheitern, öffne **Assets → AppIcon** in Xcode. Das 1024x1024-App-Icon findest du unter `assets/icon.png`.

**Hinweis zur Fotomediathek:** Die App verwendet HTML-Dateiauswahl für Streckenbilder. Falls Xcode oder das reale iPhone beim Testen eine Fotoberechtigung benötigt, ergänze nur die tatsächlich benötigten `Privacy - Photo Library Usage Description`/`NSPhotoLibraryUsageDescription` mit einer ehrlichen deutschen Beschreibung. Kamera-Zugriff ist nicht als native Kamerafunktion eingerichtet.

## 4. Nach jeder Änderung

Ändere deine App in VS Code (siehe Dateien unten), speichere und führe aus:

```bash
npm run check
npm run ios:sync
npm run ios:open
```

Dann in Xcode erneut auf ▶ klicken. Das iOS-Projekt wird **nur einmal** mit `ios:init` angelegt. Bitte den `ios/`-Ordner anschließend aufheben und in Git sichern.

## 5. App Store veröffentlichen

Folge der Datei **APPSTORE-CHECKLISTE.md**. Zum Upload in Xcode: als Ziel `Any iOS Device` wählen → **Product → Archive** → **Distribute App → App Store Connect → Upload**. Nach Verarbeitung in App Store Connect: App-Informationen, Screenshots, Datenschutz, Review-Fragen und Release einrichten.

## Dateien bearbeiten

| Datei | Inhalt |
| --- | --- |
| `www/index.html` | HTML-Struktur und iPhone-Layout |
| `www/css/styles.css` | Farben, Schriften, Abstände, Design |
| `www/js/app.js` | **Gesamte App-Logik**: Bikes, Events, Service, Strecken, Backups |
| `www/js/register-sw.js` | PWA-Caching nur über HTTPS |
| `www/sw.js` | Offline-Cache der Webversion |
| `www/icon-*.png` | Web-Icons |
| `assets/icon.png` | iOS-App-Icon, 1024×1024 |
| `capacitor.config.json` | App-Name, Bundle-ID, lokaler Webordner |

## Daten & Datenschutz

Die App nutzt im normalen Capacitor-/Browserbetrieb `localStorage` auf dem jeweiligen Gerät. Die unveränderte App enthält alte Claude-Testumgebungs-Synchronisierung, die **außerhalb von Claude nicht aktiv** wird. Die Schriftarten werden derzeit noch über Google Fonts geladen, sofern eine Netzwerkverbindung besteht; offline erscheinen Fallback-Schriften.

**Nicht als Cloud-Backup missverstehen:** Daten aus Claude, deinem Browser und der iPhone-App werden **nicht automatisch synchronisiert**. Testdaten aus Claude vor dem Wechsel über **Mehr → Daten & Backup → Sicherung kopieren** exportieren und in der neuen App über **Sicherung einspielen** importieren.

Der bisherige Backup-Export verwendet die Zwischenablage und hat eine manuelle Text-Fallbackanzeige. Auf dem iPhone und mit vielen Bildern muss diese Funktion **vor Veröffentlichung real getestet** werden. `localStorage` hat Speichergrenzen; viele Streckenbilder können diese erreichen. Die App zeigt bei Speicherfehlern derzeit nicht überall zuverlässig eine Warnung an. Vor produktiver Nutzung ist eine robustere Speicherung/Datei-Backupfunktion sinnvoll.

## Wichtiger Hinweis

Eine Capacitor-App ist eine **native iOS-Hülle mit integrierter Weboberfläche** (WKWebView), keine komplett in Swift/Flutter neu implementierte App. Das erlaubt eine Veröffentlichung über den App Store, **garantiert aber keine Zulassung**. Apple prüft unter anderem eine ausreichend eigenständige Funktionalität, Datenschutz, Darstellung, Stabilität und Rechte an Inhalten.
