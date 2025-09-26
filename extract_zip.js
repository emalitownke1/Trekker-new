import yauzl from 'yauzl';
import fs from 'fs';
import path from 'path';

function extractZip(zipPath, outputDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, {lazyEntries: true}, (err, zipfile) => {
      if (err) return reject(err);
      
      const entries = [];
      
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        console.log(`Found entry: ${entry.fileName}`);
        entries.push(entry.fileName);
        
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);
            
            const outputPath = path.join(outputDir, entry.fileName);
            const outputDirPath = path.dirname(outputPath);
            
            // Ensure directory exists
            if (!fs.existsSync(outputDirPath)) {
              fs.mkdirSync(outputDirPath, { recursive: true });
            }
            
            const writeStream = fs.createWriteStream(outputPath);
            readStream.pipe(writeStream);
            
            writeStream.on('close', () => {
              console.log(`Extracted: ${entry.fileName}`);
              zipfile.readEntry();
            });
          });
        }
      });
      
      zipfile.on("end", () => {
        console.log("Extraction complete");
        resolve(entries);
      });
    });
  });
}

// Extract the STK API zip
extractZip('./assets/stkapi.zip', './assets/extracted')
  .then(entries => {
    console.log('\nExtracted files:');
    entries.forEach(file => console.log(`  ${file}`));
  })
  .catch(err => {
    console.error('Error:', err);
  });