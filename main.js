const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const scraperAlkosto = require('./scrapers/scraper_alkosto');
const scraperML = require('./scrapers/scraper_mercadolibre');
const scraperExito = require('./scrapers/scraper_exito');
const scraperFalabella = require('./scrapers/scraper_falabella');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files
app.use(bodyParser.json());

// Serve the HTML file from the root directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission
app.post('/scrape', async (req, res) => {
    const { productName } = req.body;
    if (!productName) {
        return res.status(400).send({ error: 'Product name is required' });
    }

    try {
        const scrapeResults = await Promise.all([
            scraperML(productName),
            scraperAlkosto(productName),
            scraperExito(productName),
            scraperFalabella(productName)
        ]);

        // Combine results from all scrapers into a single array
        const products = scrapeResults.reduce((accumulator, current) => accumulator.concat(current), []);

        res.send(products);
    } catch (error) {
        console.error('Error scraping:', error);
        res.status(500).send({ error: 'Failed to scrape products' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

