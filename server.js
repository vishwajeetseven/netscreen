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

// Route to handle the search query and use Puppeteer
app.post('/search', async (req, res) => {
    const { searchQuery } = req.body;

    if (!searchQuery) {
        return res.status(400).send({ error: 'Search query is required' });
    }

    try {
        // Launch Puppeteer browser in headless mode
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Navigate to Google and search for the query
        await page.goto('https://www.google.com');
        await page.type('input[name=q]', searchQuery); // Type search query in the Google search box
        await page.keyboard.press('Enter'); // Press 'Enter' to submit the search

        // Wait for search results to load
        await page.waitForSelector('h3'); // Wait for at least one result (h3 tag in results)

        // Extract search result titles and URLs
        const results = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('h3').forEach(item => {
                const link = item.closest('a');
                if (link) {
                    items.push({
                        title: item.innerText,
                        url: link.href
                    });
                }
            });
            return items;
        });

        // Close the browser
        await browser.close();

        // Send results as the response
        res.status(200).send({ results });
    } catch (error) {
        console.error('Error during Puppeteer search:', error);
        res.status(500).send({ error: 'Failed to perform search' });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
