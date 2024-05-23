import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import scraperAlkosto from './scrapers/scraper_alkosto.js';
import scraperMercadoLibre from './scrapers/scraper_mercadolibre.js';
import scraperExito from './scrapers/scraper_exito.js';
import scraperFalabella from './scrapers/scraper_falabella.js';
import scraperOlimpica from './scrapers/scraper_olimpica.js';

// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/scrape', async (req, res) => {
    const { productName } = req.body;
    if (!productName) {
        return res.status(400).send({ error: 'Product name is required' });
    }

    try {
        const scrapeResults = await Promise.all([
            scraperMercadoLibre(productName),
            scraperAlkosto(productName),
            scraperExito(productName),
            scraperFalabella(productName),
            scraperOlimpica(productName)
        ]);

        const products = scrapeResults.flat();

        res.send(products);
    } catch (error) {
        console.error('Error scraping:', error);
        res.status(500).send({ error: 'Failed to scrape products' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
