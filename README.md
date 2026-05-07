# CheapID
A research repository that has cheap alternative for Id creation(bulk)
## Photoshop Batch ID Processor

This repository includes a Photoshop script for batch processing ID cards.

### Usage

1. Open your ID template PSD file in Photoshop.
2. Ensure you have text layers named exactly "StudentName" and "Gender".
3. Run the script `Scripts/BatchIDProcessor.jsx` from Photoshop's Scripts menu.
4. Select your CSV file with student data (columns: Name, Gender).
5. Choose an output folder.
6. The script will generate individual ID cards as PNG or JPG files.

### CSV Format

The CSV should have a header row, followed by data rows with:
- Column 1: Student Name
- Column 2: Gender

Example:
```
Name,Gender
John Doe,Male
Jane Smith,Female
```