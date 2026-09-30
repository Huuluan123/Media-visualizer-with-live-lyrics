# Lively Music Visualizer with Live Lyrics

A modern, dynamic music wallpaper for **Lively Wallpaper** featuring real-time lyric synchronization, adaptive album colors, an interactive YouTube-style seek bar, and customizable audio spectrum visualizers.

<img width="1917" height="1078" alt="Screenshot 2026-09-29 223834" src="https://github.com/user-attachments/assets/48b66e42-41ad-4679-aee3-a067d04a3e16" />



<img width="800" height="450" 
     alt="2026-09-3010-37-15-ezgif com-video-to-gif-converter" 
     src="https://github.com/user-attachments/assets/f2d6d03a-3172-482d-a411-b3e61e792615" 
     style="display: block; margin: 0 auto;" align = "center"/>


---

## ✨ Features

- **Fluid Aurora Shader:** Dynamic background reacting smoothly with mesh gradients.
- **ColorThief Palette Extraction:** Automatically syncs background glow, spectrum, and accent colors with the current track's album art (with dark cover auto-adaptation).
- **Interactive Scrubber:** YouTube/Spotify-style seek bar with live preview, hover effects, and drag-and-drop seeking.
- **Dual Visualizer Modes:** Switch between **Centered Rounded Bars** and **Floating Dots** via the Lively Properties menu.
- **60 FPS Smooth Interpolation:** Audio frequencies and progress are smoothly lerped at 60 FPS using `requestAnimationFrame`.
- **System Media Controls (SMTC):** Full Play/Pause, Next, and Previous controls directly from your desktop via WebSocket bridge.
- **Synced Lyrics:** Real-time lyric fetching and synchronization powered by [LRCLIB](https://lrclib.net/).

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Canvas 2D, WebSocket API), [ColorThief](https://lokeshdhakar.com/projects/color-thief/).
- **Backend Bridge:** C# (.NET 8.0), Windows Runtime (`Windows.Media.Control` / SMTC), [Fleck](https://github.com/statianzo/Fleck) (WebSocket Server).
- **Host:** [Lively Wallpaper](https://rocksdanister.github.io/lively/).

---

## 🚀 Getting Started

### 1. Build the C# Bridge
```powershell
cd Bridge
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

### 2. Install to Lively Wallpaper
1. Open Lively Wallpaper.
2. Click **Add Wallpaper** -> Browse to the `Wallpaper/` directory and select `index.html`.
3. Start `MediaTimelineBridge.exe` in the background (or configure Lively to launch it).
4. Play any track on Spotify, Apple Music, or your browser.

---

## 🚀 Installation

1. Download the latest `LivelyMusicVisualizer.livelyzip` from the **Releases** tab.
2. Drag and drop the `.livelyzip` file into the **Lively Wallpaper** window.
3. Right-click the wallpaper in Lively and select **Open File Location**.
4. Run `Install.bat` once to register and start the `MediaTimelineBridge` background service.
5. Play music on Spotify, Apple Music, or your browser to enjoy the synced visualizer!

> **To uninstall:** Simply open the file location and run `Uninstall.bat` before removing the wallpaper from Lively.

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
