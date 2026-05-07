#target photoshop

// ==========================================
// CONFIGURATION
// ==========================================
var NAME_LAYER   = "StudentName"; // Exact name of the name text layer
var GENDER_LAYER = "Gender";      // Exact name of the gender text layer
var OUTPUT_FORMAT = "PNG";        // Options: "PNG" or "JPG"
// ==========================================

// ExtendScript-safe string trim (avoids "trim is not a function")
function safeTrim(str) {
    return str ? str.replace(/^\s+|\s+$/g, '') : '';
}

// Robust CSV line parser (handles commas inside quoted names safely)
function parseCSVLine(line) {
    var result = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i); // ES3-safe string indexing
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function main() {
    if (app.documents.length === 0) {
        alert("Please open your ID template in Photoshop first.");
        return;
    }

    var csvFile = File.openDialog("Select the CSV file containing student data");
    if (!csvFile) return;

    var outputFolder = Folder.selectDialog("Select a folder to save the generated IDs");
    if (!outputFolder) return;

    // Set encoding to prevent garbled special characters in names
    csvFile.encoding = "UTF-8";
    csvFile.open("r");
    var rawText = csvFile.read();
    csvFile.close();

    // Normalize line endings & strip BOM if present
    var lines = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    // Collect valid data rows (skip header + empty lines)
    var dataRows = [];
    for (var i = 1; i < lines.length; i++) {
        if (safeTrim(lines[i]) !== "") {
            dataRows.push(lines[i]);
        }
    }

    if (dataRows.length === 0) {
        alert("No data rows found in the CSV (after the header).");
        return;
    }

    var doc = app.activeDocument;
    var nameLayer = findTextLayer(doc, NAME_LAYER);
    var genderLayer = findTextLayer(doc, GENDER_LAYER);

    if (!nameLayer || !genderLayer) {
        alert("Error: Could not find text layers named exactly '" + NAME_LAYER + "' and/or '" + GENDER_LAYER + "'.\nPlease rename your layers in Photoshop and try again.");
        return;
    }

    var processedCount = 0;
    var errorCount = 0;

    for (var i = 0; i < dataRows.length; i++) {
        try {
            var cols = parseCSVLine(dataRows[i]);
            var studentName = safeTrim(cols[0]) || "Unknown_Student";
            var gender = safeTrim(cols[1]) || "";

            // Update text layers
            nameLayer.textItem.contents = studentName;
            genderLayer.textItem.contents = gender;

            // Sanitize filename for OS compatibility
            var safeName = studentName.replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
            if (safeName.length === 0 || safeName === "_") safeName = "ID_" + (i + 1);

            var outputFile = new File(outputFolder.fsName + "/" + safeName + "." + OUTPUT_FORMAT.toLowerCase());

            // Export
            if (OUTPUT_FORMAT === "PNG") {
                var opts = new PNGSaveOptions();
                opts.compression = 6;
            } else {
                var opts = new JPEGSaveOptions();
                opts.quality = 10;
                opts.matte = MatteType.NONE;
            }
            
            // asCopy=true prevents the template from being overwritten or closed
            doc.saveAs(outputFile, opts, true, Extension.LOWERCASE);
            processedCount++;
        } catch (e) {
            errorCount++;
            $.writeln("Error on row " + (i + 2) + ": " + e.toString());
        }
    }

    app.bringToFront();
    var msg = "Successfully generated " + processedCount + " ID cards.";
    if (errorCount > 0) msg += "\n" + errorCount + " rows failed (check ExtendScript console for details).";
    alert(msg);
}

// Recursively searches for a text layer by name (supports layer groups)
function findTextLayer(doc, targetName) {
    function search(layerArray) {
        for (var i = 0; i < layerArray.length; i++) {
            var layer = layerArray[i];
            if (layer.name === targetName && layer.kind === LayerKind.TEXT) {
                return layer;
            }
            // ExtendScript uses "LayerSet" for groups
            if (layer.typename === "LayerSet" && layer.layers) {
                var found = search(layer.layers);
                if (found) return found;
            }
        }
        return null;
    }
    return search(doc.layers);
}

main();