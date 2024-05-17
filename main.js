const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const scrappingAlkosto = require('./scrappers/scrapper_alkosto'); // Adjust the path if necessary

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
        const products = await scrappingAlkosto(productName);
        res.send(products);
    } catch (error) {
        console.error('Error scraping Alkosto:', error);
        res.status(500).send({ error: 'Failed to scrape products' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
