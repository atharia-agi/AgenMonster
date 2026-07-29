# Production Release Guide

## Building

```bash
cd apps/desktop
npm ci
npm run build
npx tauri build          # SPA + EXE in src-tauri/target/release/
npx tauri build --target nsis   # adds Windows installer
```

Built artifacts land in:
- `apps/desktop/src-tauri/target/<triple>/release/` — EXE + DLLs
- `apps/desktop/src-tauri/target/<triple>/release/bundle/nsis/` — installer EXE
- `apps/desktop/src-tauri/target/<triple>/release/bundle/app/` — AppBundle

Hand-rolled portable bundle: zip `dist/AgenMonster\*` → `AgenMonster-portable-win64.zip`.

## Code Signing (recommended for production)

Unsigned executables trigger SmartScreen warnings. Sign every EXE and DLL before
publishing.

### Certificate types

| Type | Issuer | Cost | SmartScreen rep |
|------|--------|------|-----------------|
| OV Code Signing | Public CA (DigiCert, Sectigo) | ~\$300/yr | Establishes after ~30 signed files |
| EV Code Signing | Public CA + HSM/token | ~\$600/yr | Instant SmartScreen trust |
| Self-signed | OpenSSL  / `osslsigncode` | Free | Triggers SmartScreen warning |

For early releases, OV is the minimum viable choice. Use EV if you want
SmartScreen green on first launch.

### Getting a cert

1. Buy OV or EV Code Signing from DigiCert, Sectigo, or GlobalSign.
2. Complete identity verification (business registration, phone, etc.).
3. Export as `.pfx` (PKCS#12) with your private key. Protect the `.pfx` with
   a strong password — this is your signing identity.

### Signing with `osslsigncode` (free, Windows/Mac/Linux)

```bash
# Install
# Windows: choco install osslsigncode
# macOS:   brew install osslsigncode
# Linux:   apt-get install osslsigncode

osslsigncode sign \
  -pkcs12 "C:\certs\agenmonster.pfx" \
  -pass "YOUR_PFX_PASSWORD" \
  -n "AgenMonster Desktop" \
  -url "https://github.com/atharia-agi/AgenMonster" \
  -t "http://timestamp.digicert.com" \
  -i "icons/icon.png" \
  -in dist/AgenMonster/agenmonster-desktop.exe \
  -out dist/AgenMonster/agenmonster-desktop-signed.exe

# Verify
osslsigncode verify dist/AgenMonster/agenmonster-desktop-signed.exe
```

Sign the DLLs too:

```bash
for f in agenmonster_desktop_lib.dll WebView2Loader.dll; do
  osslsigncode sign \
    -pkcs12 "C:\certs\agenmonster.pfx" \
    -pass "YOUR_PFX_PASSWORD" \
    -t "http://timestamp.digicert.com" \
    -in "dist/AgenMonster/$f" \
    -out "dist/AgenMonster/${f%.dll}-signed.dll"
done
```

### Signing via CI / GitHub Actions

1. Convert `.pfx` → PEM split:

   ```bash
   openssl pkcs12 -in agenmonster.pfx -nocerts -out key.pem -nodes
   openssl pkcs12 -in agenmonster.pfx -nokeys -out cert.pem
   ```

2. Store `key.pem` and `cert.pem` as GitHub encrypted secrets:
   `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_CERTIFICATE`.

3. Add `tauri.conf.json` signing config (already present):

   ```json
   "bundle": {
     "windows": {
       "certificateThumbprint": null,
       "timestampUrl": "http://timestamp.digicert.com"
     }
   }
   ```

4. In CI, pass env vars before `tauri build`:

   ```yaml
   - run: npx tauri build
     env:
       TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
   ```

### Timestamping always

Use a trusted timestamp URL so signatures remain valid after the cert expires:

| CA | Timestamp URL |
|----|--------------|
| DigiCert | `http://timestamp.digicert.com` |
| Sectigo | `http://timestamp.sectigo.com` |
| GlobalSign | `http://timestamp.globalsign.com` |

Without a timestamp, the signature expires when your cert does and Windows
will treat the binary as untrusted.

## Publisher identity

- Windows SmartScreen and Store trust are scoped to the **publisher name** as
  it appears on the cert. Make sure `CompanyName` in `app.rc` and the
  `"publisher"` field in `tauri.conf.json` match the cert's Organization name
  exactly.
- Recommended: register a domain (e.g. `agenmonster.dev`), use that as the
  publisher identity. Update the `Comodo` / DigiCert registration accordingly.
- `"publisher": "AgenMonster Team"` is currently a placeholder — replace before
  your first signing.

## Release checklist

- [ ] `npm test` → 427/427 green
- [ ] `npm run lint` → 0 errors, 0 warnings
- [ ] `npx tauri build` → EXE boots, no link warnings
- [ ] Code-sign all EXE + DLL artifacts
- [ ] `QA_HASHES.txt` checksums computed and committed alongside the ZIP
- [ ] Tag `v1.0.0` pushed to `main`
- [ ] GitHub Actions `release.yml` fires (or manual draft created)
- [ ] `CHANGELOG.md` updated with release bullets
- [ ] `release.yml` artifact uploaded (ZIP + EXE + installer + checksums)
- [ ] Release published (not draft) from GitHub

## Security checklist

- [ ] `.env` is in `.gitignore` AND never appears in any commit (`git log --all -- .env`)
- [ ] `tauri.conf.json` `tauri > allowlist` allows only required scopes
- [ ] `CHANGELOG.md` reviewed for accidental key/secret mentions
- [ ] No `fetch()` from WebView to non-allowlisted origins without proxy
- [ ] `app.rc`/`build.rs` metadata discloses correct copyright holder
