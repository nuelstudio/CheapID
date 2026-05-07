# Photoshop Batch ID Generator with Photo Support

This ExtendScript automates the creation of student ID cards in Adobe Photoshop using a CSV data file and individual student photos.

## 📋 Prerequisites

- **Adobe Photoshop** (CC or later recommended)
- **CSV File** containing student data
- **Student Photos** in a dedicated folder
- **Photoshop Template** (.psd) with specific layer names

---

## 📁 File Structure Setup

Organize your files like this:

```
/ID_Project_Folder/
│
├── template.psd              # Your Photoshop ID template
├── students.csv              # Data file with names, gender, and photo filenames
├── /photos/                  # Folder containing all student images
│   ├── john_doe.jpg
│   ├── jane_smith.png
│   └── ...
└── /output/                  # (Created automatically) Generated ID cards
```

---

## 🛠️ Step 1: Prepare the Photoshop Template

1. Open your ID card design in Photoshop.
2. Ensure you have the following layers (exact names required):
   - **`StudentName`**: A text layer where the student's name will appear.
   - **`Gender`**: A text layer where the gender will appear.
   - **`StudentPhoto`**: A placeholder layer for the photo.
     - *Tip:* Create a generic rectangle shape or place a dummy image on this layer to define the desired size and position. The script will replace this content.
     - *Note:* This layer can be inside a Group/LayerSet.

3. Save this file as `template.psd`.

---

## 📝 Step 2: Prepare the CSV Data File

Create a CSV file (e.g., `students.csv`) with the following structure. **Do not include a header row** unless you modify the script to skip it (the default script assumes Row 1 is data, but the provided code skips row 0 as header).

*Correction based on the script provided:* The script explicitly skips the first line (`i = 1`) assuming it is a header.

**Format:**
```csv
Name,Gender,PhotoFilename
John Doe,Male,john_doe.jpg
Jane Smith,Female,jane_smith.png
Alex Johnson,Male,alex_j.png
```

**Important Rules:**
- **Column 1:** Full Name (must match the `StudentName` layer content requirements).
- **Column 2:** Gender.
- **Column 3:** Exact filename of the photo (including extension like `.jpg`, `.png`). The file must exist in the photos folder you select later.
- **Quotes:** If a name contains a comma (e.g., `Doe, John Jr.`), wrap the name in double quotes: `"Doe, John Jr.",Male,image.jpg`.

---

## 🖼️ Step 3: Prepare the Photos

1. Create a folder (e.g., `photos`) and place all student images inside.
2. Ensure the filenames match **exactly** what is listed in the CSV (case-sensitive).
3. Supported formats: JPG, PNG, TIFF, PSD.
4. *Recommendation:* Photos should ideally be portrait orientation and high resolution, but the script will scale them to fit the placeholder layer.

---

## 🚀 Step 4: Running the Script

1. **Open Photoshop.**
2. **Open your template file** (`template.psd`).
3. Go to **File > Scripts > Browse...**
4. Select the `.jsx` script file you saved.
5. **Follow the Prompts:**
   - **Select CSV:** Choose your `students.csv`.
   - **Select Output Folder:** Choose where to save the final ID cards.
   - **Select Photo Folder:** Choose the folder containing the student images.

6. **Wait for Completion:**
   - The script will iterate through every row in the CSV.
   - It updates the text layers.
   - It places and resizes the photo into the `StudentPhoto` layer bounds.
   - It saves the result as a PNG or JPG (based on your configuration).

---

## ⚙️ Configuration Options

Open the script in a text editor (like Notepad, TextEdit, or VS Code) to change these variables at the top:

```javascript
var NAME_LAYER    = "StudentName";   // Must match your PS layer name
var GENDER_LAYER  = "Gender";        // Must match your PS layer name
var PHOTO_LAYER   = "StudentPhoto";  // Must match your PS placeholder layer
var OUTPUT_FORMAT = "PNG";           // Options: "PNG" or "JPG"
```

---

## ❓ Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Could not find text layers"** | Check that `StudentName` and `Gender` layers exist and are spelled exactly as in the config. Ensure they are Text Layers, not rasterized. |
| **"Could not find photo layer"** | Ensure a layer named `StudentPhoto` exists. It can be a shape, smart object, or image layer. |
| **Photos missing in output** | Check the filename in the CSV matches the file in the folder exactly. Check the console for "Image not found" errors. |
| **Garbled text in names** | Ensure your CSV is saved with **UTF-8** encoding. |
| **Script stops unexpectedly** | Check the ExtendScript Console (`Window > Extensions > Scripting Tools` or press `F5` in ESTK) for specific error logs. |

---

## 💡 Tips for Best Results

- **Placeholder Size:** Make sure your `StudentPhoto` placeholder layer in the template is the exact size and position you want the final photos to appear. The script scales the input image to fit this layer's bounds while maintaining aspect ratio.
- **Batch Size:** For very large batches (1000+), test with 5-10 rows first to ensure alignment and text wrapping look correct.
- **File Naming:** Avoid special characters in photo filenames to prevent OS saving errors.

---

## 📄 License

Free to use and modify for personal and commercial projects.
