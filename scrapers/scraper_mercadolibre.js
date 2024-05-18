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

        const searchLink = `https://listado.mercadolibre.com.co/${productName.replace(/ /g, "-")}`;

        await page.goto(searchLink);
        await page.waitForLoadState('domcontentloaded');

        const filterByNew = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')", { timeout: 8000 });
        await filterByNew.click();

        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.waitForLoadState('domcontentloaded');

        const items = await page.$$('h2.ui-search-item__title');

        const filteredItems = await Promise.all(items.map(async (item) => {
            const text = (await item.innerText()).toLowerCase().replace(/[\s\u00A0]+/g, " ");
            return productName.trim().toLowerCase().split(' ').every(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
        }));

        const finalItems = items.filter((_item, index) => filteredItems[index]);

        if (finalItems.length > productId) {
            try {
                await finalItems[productId].click();
                await page.waitForLoadState('domcontentloaded');
                await new Promise(resolve => setTimeout(resolve, 5500));

                const seller = "Mercado Libre";
                const url = page.url();
                const title = await page.$eval('.ui-pdp-title', element => element.innerText.trim());
                const price = await page.$eval('.ui-pdp-price__second-line', element => {
                    let text = element.innerText.trim();
                    let lines = text.split('\n');
                    return `${lines[0]}${lines[1]}`;
                });
                const image = await page.$eval('.ui-pdp-gallery__figure img', element => element.getAttribute('src'));
                const full_description = await page.waitForSelector("a.ui-pdp-collapsable__action[title='Ver descripción completa']");
                await full_description.click();
                const description = await page.$eval('.ui-pdp-description__content', element => element.innerHTML);
                let specifications;
                try {
                    specifications = await page.$eval('.ui-vpp-highlighted-specs__features-list', element => {
                        const items = element.innerText.split('\n').map(item => `<li>${item.trim()}</li>`).join('');
                        return `<ul>${items}</ul>`;
                    });
                } catch {
                    try {
                        specifications = await page.$eval('.ui-vpp-highlighted-specs__attribute-columns', element => element.innerText.trim());
                    } catch {
                        specifications = 'No se encontraron especificaciones';
                    }
                }

                await browser.close();
                return { title, price, image, description, specifications, seller, url, found: true };
            } catch (error) {
                await browser.close();
                console.log(`Error processing product ${productId} from Mercado Libre:`, error);
            }
        } else {
            await browser.close();
            console.log('No matching product found for the given productId:', productId);
        }

    } catch (error) {
        console.error('Error in getMLProduct:', error);
        await browser.close();
        return { found: false, error: error.message };
    }
};

module.exports = scrapingML;