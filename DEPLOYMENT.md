# GitHub Pages Deployment Guide

## 🚀 Automatisches Deployment

Das LC-Kern-System ist für automatisches Deployment auf GitHub Pages konfiguriert.

### Voraussetzungen

1. **GitHub Repository**: Code liegt unter `https://github.com/mstreicher/lizenzmanager`
2. **GitHub Pages aktiviert**: Muss in den Repository-Einstellungen aktiviert werden
3. **VIDIS-Konfiguration**: Redirect-URIs müssen für beide Umgebungen konfiguriert sein

### GitHub Pages Einrichtung

1. **Repository-Einstellungen öffnen**:
   - Gehen Sie zu `https://github.com/mstreicher/lizenzmanager/settings`
   - Navigieren Sie zu "Pages" im linken Menü

2. **Source konfigurieren**:
   - Source: "GitHub Actions"
   - Branch: Wird automatisch von der Action verwaltet

3. **Deployment starten**:
   - Push zu `main` Branch startet automatisches Deployment
   - Oder manuell über "Actions" → "Deploy to GitHub Pages" → "Run workflow"

## 🌍 Multi-Environment Support

### Development (localhost)
```bash
npm run dev
```
- URL: `https://localhost:5173`
- VIDIS Redirect: `https://localhost:5173/auth/callback`
- Environment: `.env`

### Production (GitHub Pages)
```bash
npm run build:prod
npm run preview:prod
```
- URL: `https://mstreicher.github.io/lizenzmanager`
- VIDIS Redirect: `https://mstreicher.github.io/lizenzmanager/auth/callback`
- Environment: `.env.production`

## 🔧 VIDIS-Konfiguration

### Erforderliche Redirect-URIs in VIDIS

Der VIDIS-Client `lc-kern-client` muss folgende Redirect-URIs unterstützen:

```
https://localhost:5173/auth/callback
https://mstreicher.github.io/lizenzmanager/auth/callback
```

### Automatische URL-Erkennung

Das System erkennt automatisch die Umgebung und verwendet die korrekten URLs:

```javascript
// Development
if (hostname === 'localhost') {
  redirectUri = 'https://localhost:5173/auth/callback';
}

// Production
if (hostname.includes('github.io')) {
  redirectUri = 'https://mstreicher.github.io/lizenzmanager/auth/callback';
}
```

## 📁 Deployment-Dateien

### GitHub Actions Workflow
- `.github/workflows/deploy.yml` - Automatisches Deployment

### Environment-Konfiguration
- `.env` - Development (localhost)
- `.env.production` - Production (GitHub Pages)

### SPA-Routing Support
- `public/404.html` - GitHub Pages SPA-Routing
- `index.html` - SPA-Routing-Script

### Build-Konfiguration
- `vite.config.js` - Multi-Environment Build-Setup
- `package.json` - Deploy-Scripts

## 🔄 Deployment-Prozess

### Automatisch (empfohlen)
1. Code zu `main` Branch pushen
2. GitHub Actions startet automatisch
3. Build wird erstellt
4. Deployment zu GitHub Pages
5. Verfügbar unter `https://mstreicher.github.io/lizenzmanager`

### Manuell
```bash
# Build für Production
npm run build:prod

# Lokale Vorschau
npm run preview:prod

# Deploy (wird von GitHub Actions übernommen)
npm run deploy
```

## 🐛 Troubleshooting

### Deployment-Probleme

1. **GitHub Actions Fehler**:
   - Überprüfen Sie die Actions-Logs
   - Stellen Sie sicher, dass GitHub Pages aktiviert ist

2. **404-Fehler bei Routing**:
   - `404.html` muss im `public/` Ordner sein
   - SPA-Routing-Script in `index.html` überprüfen

3. **VIDIS-Redirect-Fehler**:
   - Redirect-URIs in VIDIS-Client überprüfen
   - Environment-URLs in `.env.production` kontrollieren

### VIDIS-Integration

1. **Invalid Redirect URI**:
   ```
   Lösung: Beide URLs in VIDIS-Client konfigurieren:
   - https://localhost:5173/auth/callback
   - https://mstreicher.github.io/lizenzmanager/auth/callback
   ```

2. **Environment-Detection**:
   ```javascript
   // Debug-Ausgabe in Browser-Konsole
   console.log('Environment:', getCurrentEnvironment());
   console.log('Redirect URI:', getVidisRedirectUri());
   ```

## 📊 Monitoring

### Deployment-Status
- GitHub Actions: `https://github.com/mstreicher/lizenzmanager/actions`
- GitHub Pages: Repository Settings → Pages

### Live-URLs
- **Development**: `https://localhost:5173`
- **Production**: `https://mstreicher.github.io/lizenzmanager`
- **API-Docs**: `https://mstreicher.github.io/lizenzmanager/api-docs`

## 🔐 Sicherheit

### Environment-Variablen
- Keine Secrets in `.env.production` (öffentlich sichtbar)
- VIDIS Client-Secret ist für öffentliche Clients gedacht
- Supabase RLS-Policies schützen Daten

### HTTPS
- GitHub Pages: Automatisches SSL
- Development: Eigene SSL-Zertifikate (`ssl.crt`, `ssl.key`)

## 📝 Wartung

### Updates
1. Code-Änderungen zu `main` pushen
2. Automatisches Deployment startet
3. Neue Version verfügbar nach ~2-3 Minuten

### Environment-Updates
- `.env.production` für Production-Änderungen
- `.env` für Development-Änderungen
- Beide Umgebungen testen vor Deployment
