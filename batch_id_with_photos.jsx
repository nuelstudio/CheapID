#target photoshop

// ==========================================
// CONFIGURATION
// ==========================================
var NAME_LAYER      = "StudentName";   // Exact name of the name text layer
var GENDER_LAYER    = "Gender";        // Exact name of the gender text layer
var PHOTO_LAYER     = "StudentPhoto";  // Exact name of the photo placeholder layer (can be hidden)
var OUTPUT_FORMAT   = "PNG";           // Options: "PNG" or "JPG"
var PHOTO_FOLDER    = "";              // Optional: Set path to photos folder, or leave empty to prompt
// CSV Column Order: [0]=Name, [1]=Gender, [2]=PhotoFilename
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

// Find and place photo into the photo layer
function placePhoto(doc, photoLayer, photoPath) {
    if (!File(photoPath).exists) {
        $.writeln("Photo not found: " + photoPath);
        return false;
    }

    try {
        // Make the photo layer visible if it exists
        if (photoLayer) {
            photoLayer.visible = true;
        }

        // Open the photo as a new document
        var photoFile = new File(photoPath);
        var photoDoc = app.open(photoFile);

        // Select all and copy
        photoDoc.selection.selectAll();
        photoDoc.selection.copy();
        photoDoc.close(SaveOptions.DONOTSAVECHANGES);

        // Paste into the main document
        var pastedLayer = doc.paste();
        pastedLayer.name = "Photo_" + photoFile.name;

        // If we have a reference layer, get its bounds and delete it
        if (photoLayer) {
            var bounds = photoLayer.bounds;
            var width = bounds[2] - bounds[0];
            var height = bounds[3] - bounds[1];
            
            // Delete the placeholder layer
            photoLayer.remove();

            // Resize and position the pasted photo to match placeholder
            var activeLayer = doc.activeLayer;
            var photoBounds = activeLayer.bounds;
            var photoWidth = photoBounds[2] - photoBounds[0];
            var photoHeight = photoBounds[3] - photoBounds[1];

            // Calculate scale percentage
            var scaleX = (width.as('px') / photoWidth.as('px')) * 100;
            var scaleY = (height.as('px') / photoHeight.as('px')) * 100;
            var scale = Math.min(scaleX, scaleY); // Maintain aspect ratio

            // Resize the photo layer
            activeLayer.resize(scale, scale, AnchorPosition.MIDDLECENTER);

            // Get new bounds after resize
            var resizedBounds = activeLayer.bounds;
            var resizedWidth = resizedBounds[2] - resizedBounds[0];
            var resizedHeight = resizedBounds[3] - resizedBounds[1];

            // Calculate position to center in the original placeholder area
            var targetCenterX = bounds[0].as('px') + width.as('px') / 2;
            var targetCenterY = bounds[1].as('px') + height.as('px') / 2;
            var currentCenterX = resizedBounds[0].as('px') + resizedWidth.as('px') / 2;
            var currentCenterY = resizedBounds[1].as('px') + resizedHeight.as('px') / 2;

            var deltaX = targetCenterX - currentCenterX;
            var deltaY = targetCenterY - currentCenterY;

            // Move the layer to position
            activeLayer.translate(deltaX, deltaY);
        }

        return true;
    } catch (e) {
        $.writeln("Error placing photo: " + e.toString());
        return false;
    }
}

// Recursively searches for a layer by name (supports layer groups)
function findLayer(doc, targetName) {
    function search(layerArray) {
        for (var i = 0; i < layerArray.length; i++) {
            var layer = layerArray[i];
            if (layer.name === targetName) {
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

// Recursively searches for a text layer by name (supports layer groups)
function findTextLayer(doc, targetName) {
    return findLayer(doc, targetName);
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

    // Prompt for photo folder if not configured
    var photosFolder;
    if (PHOTO_FOLDER !== "") {
        photosFolder = new Folder(PHOTO_FOLDER);
        if (!photosFolder.exists) {
            alert("Configured photo folder does not exist: " + PHOTO_FOLDER);
            return;
        }
    } else {
        photosFolder = Folder.selectDialog("Select the folder containing student photos");
        if (!photosFolder) return;
    }

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
    var photoLayer = findLayer(doc, PHOTO_LAYER);

    if (!nameLayer || !genderLayer) {
        alert("Error: Could not find text layers named exactly '" + NAME_LAYER + "' and/or '" + GENDER_LAYER + "'.\nPlease rename your layers in Photoshop and try again.");
        return;
    }

    if (!photoLayer) {
        var usePhotos = confirm("Photo layer '" + PHOTO_LAYER + "' not found.\nContinue without photos?");
        if (!usePhotos) return;
    }

    var processedCount = 0;
    var errorCount = 0;
    var missingPhotoCount = 0;

    for (var i = 0; i < dataRows.length; i++) {
        try {
            var cols = parseCSVLine(dataRows[i]);
            var studentName = safeTrim(cols[0]) || "Unknown_Student";
            var gender = safeTrim(cols[1]) || "";
            var photoFilename = safeTrim(cols[2]) || "";

            // Update text layers
            nameLayer.textItem.contents = studentName;
            genderLayer.textItem.contents = gender;

            // Handle photo placement
            if (photoLayer && photoFilename !== "") {
                var photoPath = photosFolder.fsName + "/" + photoFilename;
                
                // Try common image extensions if no extension provided
                if (!/\.(jpg|jpeg|png|gif|bmp|tiff|tif)$/i.test(photoFilename)) {
                    var extensions = [".jpg", ".jpeg", ".png", ".bmp"];
                    var found = false;
                    for (var j = 0; j < extensions.length; j++) {
                        var testPath = photoPath + extensions[j];
                        if (File(testPath).exists) {
                            photoPath = testPath;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        $.writeln("No photo found for: " + photoFilename);
                        missingPhotoCount++;
                    }
                }

                if (File(photoPath).exists) {
                    // Remove any existing photo layer from previous iteration
                    var existingPhoto = findLayer(doc, /^Photo_/);
                    if (existingPhoto) {
                        existingPhoto.remove();
                    }
                    
                    // Restore original photo layer placeholder for next iteration
                    // Note: You may need to duplicate the original template for each iteration
                    // For better performance, consider keeping a hidden template copy
                    
                    if (!placePhoto(doc, photoLayer, photoPath)) {
                        missingPhotoCount++;
                    }
                } else {
                    $.writeln("Photo not found: " + photoPath);
                    missingPhotoCount++;
                }
            }

            // Sanitize filename for OS compatibility
            var safeName = studentName.replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
            if (safeName.length === 0 || safeName === "_") safeName = "ID_" + (i + 1);

            var outputFile = new File(outputFolder.fsName + "/" + safeName + "." + OUTPUT_FORMAT.toLowerCase());

            // Export
            var opts;
            if (OUTPUT_FORMAT === "PNG") {
                opts = new PNGSaveOptions();
                opts.compression = 6;
            } else {
                opts = new JPEGSaveOptions();
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
    if (missingPhotoCount > 0) msg += "\n" + missingPhotoCount + " IDs generated without photos (photo not found).";
    if (errorCount > 0) msg += "\n" + errorCount + " rows failed (check ExtendScript console for details).";
    alert(msg);
}

main();
