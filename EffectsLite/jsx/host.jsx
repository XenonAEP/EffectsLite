// EffectsLite host script (ExtendScript). Loaded once by CEP via the manifest <ScriptPath>.
// Every function returns a plain string "ok|message" or "err|message" (no JSON in ExtendScript).

function EL_findFootage(f) {
    var items = app.project.items;
    for (var i = 1; i <= items.length; i++) {
        var it = items[i];
        if (it instanceof FootageItem && it.mainSource instanceof FileSource && it.mainSource.file) {
            if (it.mainSource.file.fsName === f.fsName) return it;
        }
    }
    return null;
}

// path: absolute file path. opts: {mode:'place'|'import', kind:'sfx'|'overlays', fit:bool, screen:bool}
function EL_insert(path, mode, kind, fit, screen) {
    var started = false;
    try {
        var f = new File(path);
        if (!f.exists) return "err|File not found: " + f.fsName;
        var ext = f.name.split(".").pop().toLowerCase();

        app.beginUndoGroup("EffectsLite: Insert");
        started = true;

        // --- animation presets -------------------------------------------------
        if (ext === "ffx") {
            var comp0 = app.project.activeItem;
            if (!(comp0 instanceof CompItem)) return "err|Open a composition first";
            var sel = comp0.selectedLayers;
            if (!sel.length) return "err|Select a layer to apply the preset to";
            for (var s = 0; s < sel.length; s++) sel[s].applyPreset(f);
            return "ok|Applied preset to " + sel.length + " layer" + (sel.length > 1 ? "s" : "");
        }

        // --- footage ---------------------------------------------------------------
        var item = EL_findFootage(f);
        if (!item) {
            var io = new ImportOptions(f);
            item = app.project.importFile(io);
        }
        var comp = app.project.activeItem;
        if (mode === "import" || !(comp instanceof CompItem)) {
            return "ok|" + (mode === "import" ? "Imported to project" : "Imported to project (no active comp)");
        }

        var layer = comp.layers.add(item);
        layer.startTime = comp.time;

        if (kind === "overlays" && item.hasVideo) {
            if (fit && item.width > 0 && item.height > 0) {
                var k = Math.max(comp.width / item.width, comp.height / item.height) * 100;
                layer.property("ADBE Transform Group").property("ADBE Scale").setValue([k, k]);
            }
            if (screen) layer.blendingMode = BlendingMode.SCREEN;
        }
        for (var n = 1; n <= comp.numLayers; n++) comp.layer(n).selected = false;
        layer.selected = true;
        return "ok|Added to " + comp.name;
    } catch (e) {
        return "err|" + e.toString();
    } finally {
        if (started) app.endUndoGroup();
    }
}

function EL_hostInfo() {
    try { return "ok|" + app.version; } catch (e) { return "err|" + e.toString(); }
}
