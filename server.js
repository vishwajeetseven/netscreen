const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

app.use(express.static('public'));  // Serve static files from the public directory
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Endpoint to generate PDF/PNG
app.post('/generate-file', async (req, res) => {
    const url = req.body.url;  // Get the URL from the request
    const size = req.body.size || 'portrait';  // Get the size from the request, default to 'portrait'
    const format = req.body.format || 'pdf';  // Get the format (pdf/png) from the request

    if (!url) return res.status(400).send('URL is required');

    try {
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true
        });

        const page = await browser.newPage();
        await page.setViewport({
            width: 1266,
            height: 758,
            deviceScaleFactor: 1
        });
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for the page to load completely
        // This is the correct way to pause execution
        await new Promise(r => setTimeout(r, 7000));

        const pdfOptions = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '10mm',
                bottom: '20mm',
                left: '10mm'
            }
        };

        // Change orientation based on the size selection
        if (size === 'landscape') {
            pdfOptions.landscape = true;
        }

        let fileBuffer;
        if (format === 'pdf') {
            // Generate PDF
            fileBuffer = await page.pdf(pdfOptions);
            res.setHeader('Content-Type', 'application/pdf');
        } else if (format === 'png') {
            // Generate PNG
            fileBuffer = await page.screenshot({
                fullPage: true
            });
            res.setHeader('Content-Type', 'image/png');
        } else {
            throw new Error('Unsupported format');
        }

        await browser.close();

        // Send the file to the client
        res.send(fileBuffer);
    } catch (error) {
        console.error('Error generating file:', error);
        res.status(500).send('Failed to generate file.');
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
