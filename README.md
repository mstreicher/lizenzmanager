# 🎓 LC-Kern - Universeller Lizenzvermittlungsdienst

Ein vollständiges System zur Verwaltung und Vermittlung von Bildungslizenzen mit VIDIS-Integration, entwickelt mit React, Vite und Supabase.

## 📋 Überblick

Der LC-Kern (Lizenzvermittlungsdienst) ist ein universelles System zur:
- Verwaltung von Bildungslizenzen
- VIDIS-Integration für pseudonymisierte Nutzeridentitäten
- Anbieter-Registrierung und -Verifikation
- API-Schnittstellen für externe LMS-Systeme
- SSO-Integration für medienbruchfreie Nutzung

## 🏗️ Systemarchitektur

### Komponenten
- **LC-API Gateway**: Zentrale Schnittstelle für externe Systeme
- **VIDIS Connector**: OIDC-Integration mit Mock für Entwicklung
- **Anbieter-Management**: Registrierung und Verifikation von Lizenzanbietern
- **Lizenzverwaltung**: ODRL-konforme Lizenzierung
- **Reporting-Module**: Nutzungsstatistiken und CSV-Export

### Rollen
- **Admin**: Systemverwaltung und Anbieter-Verifikation
- **Anbieter**: Lizenzbereitstellung und -verwaltung
- **Schulleiter**: Lizenzzuweisung an Klassen/Lernende
- **Lernende**: (Zukünftig) Direkter Zugriff auf Lizenzen

## 🚀 Installation & Setup

### Voraussetzungen
- Node.js (v20.19.0+ oder v22.12.0+)
- npm oder yarn
- Supabase-Account

### 1. Repository klonen
```bash
git clone <repository-url>
cd lizenzmanager
```

### 2. Dependencies installieren
```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren
Kopiere `.env.example` zu `.env` und fülle die Werte aus:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# VIDIS OIDC Configuration
VITE_VIDIS_OIDC_ISSUER=https://vidis.example.com
VITE_VIDIS_CLIENT_ID=your_client_id
VITE_VIDIS_CLIENT_SECRET=your_client_secret
VITE_VIDIS_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_VIDIS_SCOPES=openid profile email

# Development Mode (set to true for mock VIDIS)
VITE_DEVELOPMENT_MODE=true
```

### 4. Datenbank einrichten
Führe das SQL-Schema in deiner Supabase-Instanz aus:

```bash
# Öffne database-schema.sql und führe die Befehle in der Supabase SQL-Konsole aus
```

### 5. Entwicklungsserver starten
```bash
npm run dev
```

Die Anwendung ist unter `http://localhost:5173` verfügbar.

## 🧪 Tests

### Tests ausführen
```bash
# Alle Tests
npm test

# Tests mit UI
npm run test:ui

# Tests mit Coverage
npm run test:coverage
```

### Test-Struktur
- **Unit Tests**: Komponenten und Services
- **Integration Tests**: API-Endpunkte
- **Mock Tests**: VIDIS-Integration

## 📊 Datenbank-Schema

### Haupttabellen
- `users`: Erweitert um VIDIS-Pseudonyme
- `anbieter_profile`: Anbieter-Registrierungsdaten
- `oidc_configs`: OIDC-Konfigurationen
- `api_access_logs`: API-Zugriffsprotokolle
- `media_items`: Lizenzierte Medieninhalte
- `sso_sessions`: SSO-Session-Management

### Bestehende Tabellen (erweitert)
- `licenses`: ODRL-konforme Lizenzfelder
- `school_licenses`: Schulzuweisungen
- `assignments`: Individuelle Zuweisungen

## 🔌 API-Endpunkte

### Externe Integration
```javascript
// Lizenzstatus prüfen
GET /api/licenses/check?user={vidis_pseudonym}&license={license_id}

// Alle Lizenzen eines Nutzers
GET /api/licenses/user/{vidis_pseudonym}

// SSO-Weiterleitung
GET /api/sso/redirect?license_id={id}&user={pseudonym}&return_url={url}
```

### Authentifizierung
Alle API-Aufrufe erfordern einen gültigen API-Schlüssel im Header:
```
Authorization: Bearer lc_your_api_key_here
```

## 🎯 Features

### ✅ Implementiert
- **VIDIS-Integration**: OIDC mit Mock für Entwicklung
- **Anbieter-Registrierung**: Vollständiges Registrierungsformular
- **Admin-Verifikation**: Anbieter-Freigabe durch Administratoren
- **API-Service**: Externe Lizenzabfragen
- **Umfassende Tests**: Unit, Integration und Component Tests
- **Responsive UI**: Bootstrap-basiertes Design

### 🔄 In Entwicklung
- **Produktive VIDIS-Integration**: Echte OIDC-Endpunkte
- **Erweiterte Medienintegration**: Direktlinks und Vorschauen
- **Automatisierte Reports**: Geplante Berichte
- **Lernenden-Dashboard**: Direkter Zugriff für Schüler

## 🛠️ Entwicklung

### Projektstruktur
```
src/
├── components/          # React-Komponenten
│   ├── VidisLogin.jsx
│   ├── AnbieterRegistrierung.jsx
│   └── AnbieterVerifikation.jsx
├── pages/              # Seiten-Komponenten
│   ├── Login.jsx
│   ├── Register.jsx
│   └── *Dashboard.jsx
├── services/           # Business Logic
│   ├── oidcConfig.js
│   └── apiService.js
├── test/              # Test-Dateien
└── utils/             # Hilfsfunktionen
```

### Code-Standards
- **ESLint**: Automatische Code-Qualitätsprüfung
- **Prettier**: Code-Formatierung
- **Vitest**: Moderne Test-Framework
- **React Testing Library**: Component-Tests

### Git-Workflow
```bash
# Feature-Branch erstellen
git checkout -b feature/neue-funktion

# Änderungen committen
git add .
git commit -m "feat: neue Funktion hinzugefügt"

# Tests ausführen
npm test

# Pull Request erstellen
```

## 🔒 Sicherheit

### Authentifizierung
- **VIDIS OIDC**: Sichere Authentifizierung über VIDIS
- **Supabase RLS**: Row Level Security für Datenschutz
- **API-Schlüssel**: Sichere externe API-Zugriffe

### Datenschutz
- **Pseudonymisierung**: VIDIS-Pseudonyme statt echter Identitäten
- **DSGVO-konform**: Minimale Datenspeicherung
- **Verschlüsselung**: Sichere Datenübertragung

## 📈 Monitoring & Logging

### API-Zugriffe
Alle API-Zugriffe werden in `api_access_logs` protokolliert:
- Endpunkt
- Benutzer-ID
- Zeitstempel
- Response-Status

### Fehlerbehandlung
- Umfassende Error-Boundaries
- Benutzerfreundliche Fehlermeldungen
- Detaillierte Logs für Entwickler

## 🚀 Deployment

### Produktionsumgebung
```bash
# Build erstellen
npm run build

# Preview testen
npm run preview
```

### Umgebungsvariablen (Produktion)
```env
VITE_DEVELOPMENT_MODE=false
VITE_VIDIS_OIDC_ISSUER=https://real-vidis.endpoint.com
# ... weitere Produktions-URLs
```

## 📚 Dokumentation

### API-Dokumentation
- OpenAPI/Swagger-Spezifikation (geplant)
- Postman-Collection verfügbar
- Beispiel-Requests in `src/services/apiService.js`

### Benutzerhandbuch
- Admin-Funktionen: Anbieter-Verifikation
- Anbieter-Funktionen: Lizenzbereitstellung
- Schulleiter-Funktionen: Lizenzzuweisung

## 🤝 Beitragen

### Issues melden
1. GitHub Issues verwenden
2. Detaillierte Beschreibung
3. Schritte zur Reproduktion
4. Screenshots bei UI-Problemen

### Pull Requests
1. Fork des Repositories
2. Feature-Branch erstellen
3. Tests hinzufügen/aktualisieren
4. Pull Request mit Beschreibung

## 📄 Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).

## 🆘 Support

### Häufige Probleme

**VIDIS-Anmeldung funktioniert nicht**
- Prüfe `VITE_DEVELOPMENT_MODE=true` für lokale Entwicklung
- Überprüfe OIDC-Konfiguration in Supabase

**Datenbank-Fehler**
- Führe `database-schema.sql` erneut aus
- Prüfe Supabase-Verbindung

**Tests schlagen fehl**
- `npm install` erneut ausführen
- Node.js-Version prüfen (v20.19.0+)

### Kontakt
- GitHub Issues für Bugs
- Diskussionen für Feature-Requests
- E-Mail für Sicherheitsprobleme

---

**Entwickelt für die digitale Bildung** 🎓
