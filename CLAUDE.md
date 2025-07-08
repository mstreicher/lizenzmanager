# LC-Kern VIDIS Integration - Entwicklungsrichtlinien

## 🎯 **Kritische VIDIS-Konfiguration**

### **VIDIS-Client Einstellungen (lc-kern-client)**
```
Client ID: lc-kern-client
Client Secret: kCXIpvO7kVrommGAPi6RBenZCocr6fl3
Response Types: code (NUR Authorization Code Flow)
Scopes: KEINE expliziten Scopes - VIDIS verwendet automatisch Standard-Scopes
Redirect URIs:
  - https://localhost:5173/auth/callback
  - https://mstreicher.github.io/lizenzmanager/auth/callback
```

### **❌ NICHT unterstützt von VIDIS-Client:**
- `response_type=id_token` (Implicit Flow ist deaktiviert)
- `response_type=token` (Implicit Flow ist deaktiviert)
- `scope=openid` (führt zu "invalid_scope" Fehler)
- Jegliche explizite Scope-Parameter

### **✅ Korrekte Authorization URL:**
```
https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/auth?client_id=lc-kern-client&redirect_uri=[ENVIRONMENT_SPECIFIC]&response_type=code
```

## 🌍 **Multi-Environment-Konfiguration**

### **Environment-spezifische URLs:**
```javascript
// Development
if (hostname === 'localhost') {
  redirectUri = 'https://localhost:5173/auth/callback';
  baseUrl = 'https://localhost:5173';
}

// Production (GitHub Pages)
if (hostname.includes('github.io')) {
  redirectUri = 'https://mstreicher.github.io/lizenzmanager/auth/callback';
  baseUrl = 'https://mstreicher.github.io/lizenzmanager';
}
```

### **React Router Konfiguration:**
```javascript
// App.jsx
const basename = import.meta.env.PROD ? '/lizenzmanager' : '';
<BrowserRouter basename={basename}>
```

### **Vite Build-Konfiguration:**
```javascript
// vite.config.js
base: isProduction ? '/lizenzmanager/' : '/',
```

## 🔧 **VIDIS Web Component Integration**

### **Korrekte Initialisierung:**
```javascript
// 1. Script laden
script.src = 'https://repo.vidis.schule/repository/vidis-cdn/latest/vidisLogin.umd.js';

// 2. KEINE loginurl im JSX setzen
<vidis-login 
  ref={vidisButtonRef}
  size="M"
  cookie="true"
  idpdatafile="idps-test"
  idphintname="vidis_idp_hint"
/>

// 3. loginurl dynamisch setzen nach Component-Bereitschaft
vidisButton.setAttribute('loginurl', authUrl.toString());
```

### **Event-Handler:**
```javascript
vidisButton.addEventListener('vidis-login-success', handleVidisSuccess);
vidisButton.addEventListener('vidis-login-error', handleVidisError);
vidisButton.addEventListener('vidis-login-cancelled', handleVidisCancelled);
```

## 🚫 **CORS-Problem Lösung**

### **❌ Nicht möglich:**
```javascript
// Direkter Token-Austausch führt zu CORS-Fehler
fetch('https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/token', {
  method: 'POST',
  body: new URLSearchParams({ code, ... })
});
```

### **✅ Korrekte Lösung:**
```javascript
// VIDIS Web Component übernimmt Token-Austausch
// Daten kommen über vidis-login-success Event
const handleVidisSuccess = async (event) => {
  const vidisData = event.detail; // Bereits dekodierte Token-Daten
  await processVidisLogin(vidisData);
};
```

## 🗄️ **Datenbank-Konfiguration**

### **Erlaubte Rollen (users_role_check):**
```sql
CHECK (role IN ('anbieter', 'schulleiter', 'lehrer', 'admin', 'teacher', 'principal', 'provider'))
```

### **VIDIS-Rollen-Mapping:**
```javascript
const mapVidisRole = (vidisRole) => {
  switch (vidisRole) {
    case 'LEHR': return 'lehrer';     // Lehrkraft
    case 'LERN': return 'lehrer';     // Lernende (keine separate Rolle)
    case 'LEIT': return 'schulleiter'; // Schulleitung
    default: return 'lehrer';
  }
};
```

### **VIDIS-Datenverarbeitung:**
```javascript
// Access Token enthält:
{
  "sub": "ecd87a26-284f-3d8f-aa5e-54b0685b0fc8",  // Eindeutige ID
  "rolle": "LEHR",                                 // VIDIS-Rolle
  "email": "user@example.com",
  "name": "Demo User",
  "preferred_username": "username"
}

// LC-Kern Verarbeitung:
{
  email: vidisData.email,
  vidis_pseudonym: `pseudo-${vidisData.sub}`,
  role: mapVidisRole(vidisData.rolle),
  name: vidisData.name,
  vidis_sub: vidisData.sub,
  vidis_rolle: vidisData.rolle
}
```

## 📁 **GitHub Pages Deployment**

### **Automatisches Deployment:**
```yaml
# .github/workflows/deploy.yml
- name: Build for production
  run: npm run build
  env:
    NODE_ENV: production
```

### **Environment-Dateien:**
```bash
# .env (Development)
VITE_VIDIS_REDIRECT_URI=https://localhost:5173/auth/callback

# .env.production (GitHub Pages)
VITE_VIDIS_REDIRECT_URI=https://mstreicher.github.io/lizenzmanager/auth/callback
```

### **SPA-Routing Support:**
```html
<!-- public/404.html -->
<script>
  var pathSegmentsToKeep = 1; // Für GitHub Pages Project
  // Redirect-Logic für SPA-Routing
</script>
```

## 🔍 **Debugging & Troubleshooting**

### **Häufige Probleme:**

#### **1. "invalid_scope" Fehler:**
```javascript
// ❌ Falsch:
authUrl.searchParams.set('scope', 'openid');

// ✅ Korrekt:
// Kein scope Parameter - VIDIS verwendet automatisch Standard-Scopes
```

#### **2. "unsupported_response_type" Fehler:**
```javascript
// ❌ Falsch:
authUrl.searchParams.set('response_type', 'id_token');
authUrl.searchParams.set('response_type', 'token');

// ✅ Korrekt:
authUrl.searchParams.set('response_type', 'code');
```

#### **3. "unauthorized_client" + "Implicit flow is disabled":**
```
Lösung: Nur Authorization Code Flow verwenden (response_type=code)
```

#### **4. CORS-Fehler bei Token-Austausch:**
```
Lösung: VIDIS Web Component übernimmt Token-Austausch automatisch
```

#### **5. 404-Fehler bei GitHub Pages Routing:**
```javascript
// ✅ Korrekte Pfade:
href={`${import.meta.env.PROD ? '/lizenzmanager' : ''}/register`}
```

### **Debug-Ausgaben:**
```javascript
console.log('🌍 Environment Configuration:', config);
console.log('🔗 VIDIS Authorization URL:', authUrl.toString());
console.log('✅ VIDIS loginurl set:', vidisButton.getAttribute('loginurl'));
```

## 📋 **Checkliste für VIDIS-Integration**

### **✅ Vor Deployment prüfen:**
- [ ] `response_type=code` (nicht id_token oder token)
- [ ] Kein `scope` Parameter in Authorization URL
- [ ] Environment-spezifische Redirect-URIs konfiguriert
- [ ] VIDIS Web Component lädt korrekt
- [ ] `loginurl` wird dynamisch gesetzt (nicht im JSX)
- [ ] Event-Handler für `vidis-login-success` registriert
- [ ] Rollen-Mapping für VIDIS-Rollen implementiert
- [ ] Datenbank-Constraint für erlaubte Rollen konfiguriert
- [ ] GitHub Pages Basename korrekt gesetzt
- [ ] SPA-Routing mit 404.html funktioniert

### **✅ VIDIS-Client-Konfiguration:**
- [ ] Client ID: `lc-kern-client`
- [ ] Response Types: `code` (nur Authorization Code Flow)
- [ ] Redirect URIs: Beide Umgebungen (localhost + GitHub Pages)
- [ ] Scopes: Keine expliziten Scopes konfiguriert
- [ ] Implicit Flow: Deaktiviert (Standard)

### **✅ Multi-Environment-Support:**
- [ ] Development: `localhost:5173` ohne Base-Path
- [ ] Production: `mstreicher.github.io/lizenzmanager` mit Base-Path
- [ ] Environment-Detection funktioniert
- [ ] Alle Links verwenden korrekte Pfade

## 🚀 **Erfolgreicher VIDIS-Flow**

### **1. Authorization Request:**
```
https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/auth?client_id=lc-kern-client&redirect_uri=[ENV_SPECIFIC]&response_type=code
```

### **2. VIDIS-Anmeldung:**
- Weiterleitung zu Landesportal
- Erfolgreiche Authentifizierung
- Authorization Code wird generiert

### **3. Callback-Verarbeitung:**
- Redirect zu korrekter Environment-URL
- VIDIS Web Component tauscht Code gegen Token
- Kein CORS-Problem da Web Component von VIDIS-Domain

### **4. Token-Verarbeitung:**
- `vidis-login-success` Event mit dekodiertem Access Token
- VIDIS-Daten verfügbar (rolle, sub, name, email)
- LC-Kern verarbeitet Benutzerprofil automatisch

### **5. LC-Kern Integration:**
- Automatische Benutzer-/Schulerstellung in Supabase
- Rollen-Mapping (LEHR → lehrer)
- Navigation zu rollenbasiertem Dashboard

## ⚠️ **Wichtige Erinnerungen**

1. **Niemals explizite Scopes verwenden** - führt zu "invalid_scope"
2. **Nur Authorization Code Flow** - Implicit Flow ist deaktiviert
3. **VIDIS Web Component übernimmt Token-Austausch** - kein manueller fetch
4. **Environment-spezifische URLs** - localhost vs. GitHub Pages
5. **React Router Basename** - für GitHub Pages erforderlich
6. **SPA-Routing Support** - 404.html für GitHub Pages
7. **Rollen-Mapping beachten** - VIDIS → LC-Kern Rollen
8. **Datenbank-Constraints** - nur erlaubte Rollen verwenden

Diese Richtlinien IMMER befolgen, um VIDIS-Integration funktionsfähig zu halten!
