const express = require('express');
const fs = require('fs');
const { parse } = require('csv-parse');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/students', (req, res) => {
    const results = [];
    
    fs.createReadStream(path.join(__dirname, 'data', 'data.csv'), { encoding: 'utf8' })
        .pipe(parse({
            columns: (headers) => {
                // Remove BOM character if present
                return headers.map(h => {
                    let col = String(h || '').trim();
                    // Remove BOM (\ufeff) from first column
                    if (col.charCodeAt(0) === 0xfeff) {
                        col = col.slice(1);
                    }
                    return col;
                });
            },
            skip_empty_lines: true,
            relax_column_count: true,
            relax_quotes: true
        }))
        .on('data', (row) => {
            // Safely extract and clean data with proper key mapping
            const cleanedRow = {
                roll: String(row.roll || '').trim(),
                name: String(row.name || '').trim(),
                exam: String(row.exam || '').trim(),
                chem: parseInt(row.chem) || 0,
                phy: parseInt(row.phy) || 0,
                bio: parseInt(row.bio) || 0,
                math: parseInt(row.math) || 0,
                total: parseInt(row.total) || 0,
                percent: parseFloat(row.percent) || 0,
                maxTotal: parseInt(row.maxTotal) || 0,
                maxChem: parseInt(row.maxChem) || 0,
                maxPhy: parseInt(row.maxPhy) || 0,
                maxBio: parseInt(row.maxBio) || 0,
                maxMath: parseInt(row.maxMath) || 0
            };
            
            // Only add if it has required data
            if (cleanedRow.roll && cleanedRow.name) {
                results.push(cleanedRow);
            }
        })
        .on('end', () => {
            console.log(`✅ Successfully loaded ${results.length} records`);
            if (results.length > 0) {
                console.log('Sample record:', results[0]);
            }
            res.json({ 
                success: true, 
                data: results, 
                count: results.length 
            });
        })
        .on('error', (error) => {
            console.error('❌ CSV Parsing Error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error reading CSV file',
                error: error.message 
            });
        });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Visit: http://localhost:${PORT}/admin.html`);
});



