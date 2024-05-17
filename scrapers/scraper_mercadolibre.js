const { chromium } = require('playwright');

const scrapingML = async (productName) => {
    const productos = [];
    let index = 0;
    let count = 0;

    while (count < 5) {
        const product = await getMLProduct(productName, index);

        if (product && product.found) {
            productos.push(product);
            count++;
        } else {
            break;
        }

        index++;
        if (index - count > 3) {
            break;
        }
    }

    return productos;
};

const getMLProduct = async (productName, productId) => {
    try {
        const browser = await chromium.launch({ headless: false, slowMo: 500 });
        const page = await browser.newPage();

        const originalProductName = productName.trim();
        const searchLink = `https://listado.mercadolibre.com.co/${productName.replace(/ /g, "-")}`;

        await page.goto(searchLink);
        await page.waitForLoadState('domcontentloaded');

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));

            const filterByNew = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')", { timeout: 8000 });
            await filterByNew.click();
        } catch (error) {
            await browser.close();
            return null
        }

        await page.waitForLoadState('domcontentloaded');

        const items = await page.$$('h2.ui-search-item__title');

        const filteredItems = await Promise.all(items.map(async (item) => {
            const text = (await item.innerText()).toLowerCase().replace(/[\s\u00A0]+/g, " ");
            return originalProductName.toLowerCase().split(' ').every(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
        }));

        const finalItems = items.filter((_item, index) => filteredItems[index]);

        if (finalItems.length > productId) {
            try {
                await finalItems[productId].click();
                await page.waitForLoadState('domcontentloaded');
                await new Promise(resolve => setTimeout(resolve, 5500));
                
                const title = await page.$eval('.ui-pdp-title', element => element.innerText.trim());
                const price = await page.$eval('.ui-pdp-price__second-line', element => {
                    let text = element.innerText.trim();
                    let lines = text.split('\n');
                    return `${lines[0]}${lines[1]}`;
                });                
                const image = await page.$eval('.ui-pdp-gallery__figure', element => element.innerHTML);
                const fulldesc = await page.waitForSelector("a.ui-pdp-collapsable__action[title='Ver descripción completa']");
                await fulldesc.click();
                const description = await page.$eval('.ui-pdp-description__content', element => element.innerHTML);
                const specifications = await page.$eval('.ui-vpp-highlighted-specs__features-list', element => `<ul>${element.innerHTML}</ul>`)
                    .catch(async () => await page.$eval('.ui-vpp-highlighted-specs__attribute-columns', element => element.innerText.trim()));
                const url = page.url();

                await browser.close();
                return { title, price, image, description, specifications, url, found: true };
            } catch (error) {
                console.log(`Error processing product ${productId} from Mercado Libre:`, error);
            }
        } else {
            console.log('No matching product found for the given productId:', productId);
        }

    } catch (error) {

    }
};

module.exports = scrapingML;