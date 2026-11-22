# EffectsLite (v1.0.0)

**Created by [XenonAEP](https://www.youtube.com/@Xenon.ae25)**  
*Open Source on GitHub*

EffectsLite is a lightweight CEP panel extension for Adobe After Effects (2024+) that gives you instant search, live previews, and one-click timeline insertion for sound effects (SFX), video overlays, and `.ffx` animation presets.

---

## Creator & Links
* **Tag:** `XenonAEP`
* **YouTube:** [https://www.youtube.com/@Xenon.ae25](https://www.youtube.com/@Xenon.ae25)
* **TikTok:** [https://www.tiktok.com/@.xenon.aep](https://www.tiktok.com/@.xenon.aep)
* **Source Code:** Open Source on GitHub

---

## Features
* **SFX & Overlays Browser:** Instant search, audio/video previews, and one-click insertion at your playhead.
* **Custom Folders:** Create, rename, and delete custom folders, or drag and drop your own audio, video, image, and `.ffx` preset files directly into the panel.
* **Persistent User Data:** Your custom folders, favorites, and settings are stored outside the extension folder so they survive updates and reinstalls.

---

## Quick Installation

1. **Windows:** Double-click `install-windows.bat`
2. **macOS:** Right-click `install-mac.command` -> **Open** (or run `bash install-mac.command` in Terminal)
3. Fully quit and restart **Adobe After Effects**.
4. Open **Window -> Extensions -> EffectsLite** (or *Extensions (legacy)*) and dock the panel wherever you like.

*(Note: The installer scripts automatically enable `PlayerDebugMode` for Adobe CSXS 9-12 so unsigned panels can load.)*

---

## Manual Installation

1. Copy the `EffectsLite` folder into your Adobe CEP extensions directory:
   * **Windows:** `%APPDATA%\Adobe\CEP\extensions\EffectsLite`
   * **macOS:** `~/Library/Application Support/Adobe/CEP/extensions/EffectsLite`
2. Enable unsigned extensions:
   * **Windows (Command Prompt):**  
     `reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f`
   * **macOS (Terminal):**  
     `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
3. Restart After Effects.

---

## License & Open Source
This project is **open source on GitHub**. Feel free to fork, and share just credit me: XenonAEP
  Mostly Vibcoded just need a quick extension that isant blocked by a paywall
