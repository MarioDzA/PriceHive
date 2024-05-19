const { chromium } = require('playwright');

const scrapingML = async (productName) => {
    const productos = [];
    const browser = await chromium.launch({ headless: true});
    const page = await browser.newPage();

    try {
        let index = 0;
        let count = 0;

        while (count < 2) {
            const product = await getMLProduct(page, productName, index);
            if (!product || !product.found) break;

            productos.push(product);
            count++;
            index++;

            if (index - count > 3) break;
        }
    } catch (error) {
        console.error('Error in scrapingML:', error);
    } finally {
        await browser.close();
        console.log('Scrapping Finished in Mercado Libre')
    }

    return productos;
};

const getMLProduct = async (page, productName, productId) => {
    try {
        const searchLink = `https://listado.mercadolibre.com.co/${productName.replace(/ /g, "-")}`;
        await page.goto(searchLink);
        await page.waitForLoadState('domcontentloaded');

        await new Promise(resolve => setTimeout(resolve, 3000));

        const filterByNew = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')");
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

                return { title, price, image, description, specifications, seller, url, found: true };
            } catch (error) {
                console.log(`Error processing product ${productId} from Mercado Libre:`, error);
            }
        } else {
            console.log('No matching product found for the given productId on Mercado Libre:', productId);
        }

    } catch (error) {
        console.error('Error in getMLProduct:', error);
        return { found: false, error: error.message };
    }
};

module.exports = scrapingML;