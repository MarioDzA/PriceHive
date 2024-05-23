const { chromium } = require('playwright');

const scrapingMercadoLibre = async (productName) => {
    const productos = [];
    const browser = await chromium.launch({ channel: 'msedge' });
    const page = await browser.newPage();

    try {
        let index = 0;
        let count = 0;

        while (count < 3) {
            const product = await getMercadoLibreProduct(page, productName, index);

            if (product && product.found) {
                productos.push(product);
                count++;
            };

            index++;

        }
    } catch (error) {
        console.error('Error in scrapingMercadoLibre:', error);
    } finally {
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
        console.log('Scrapping Finished in Mercado Libre')
    }

    return productos;
};

const getMercadoLibreProduct = async (page, productName, productId) => {
    try {
        const searchLink = `https://listado.mercadolibre.com.co/${productName.replace(/ /g, "-")}`;
        await page.goto(searchLink);
        await page.waitForLoadState('domcontentloaded');

        await new Promise(resolve => setTimeout(resolve, 3000));

        const filterByNew = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')");
        await filterByNew.click();

        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.waitForLoadState('domcontentloaded');

        const items = await page.$$('a.ui-search-item__group__element.ui-search-link__title-card.ui-search-link');

        const filteredItems = await Promise.all(items.map(async (item) => {
            const text = (await item.innerText()).toLowerCase().replace(/[\s\u00A0]+/g, " ");
            return productName.trim().toLowerCase().split(' ').every(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
        }));

        const finalItems = items.filter((_item, index) => filteredItems[index]);

        if (finalItems.length > productId) {
            try {
                const productUrl = await finalItems[productId].getAttribute('href');
                await page.goto(productUrl)
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
                let description;
                try {
                    const full_description = await page.waitForSelector("a.ui-pdp-collapsable__action[title='Ver descripción completa']");
                    await full_description.click();
                    description = await page.$eval('.ui-pdp-description__content', element => `<p>${element.innerHTML}</p>`);
                } catch (error) {
                    description = await page.$eval('.ui-pdp-description__content', element => `<p>${element.innerHTML}</p>`);
                }

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
                        specifications = '<p>No se encontraron especificaciones</p>';
                    }
                }

                return { title, price, image, description, specifications, seller, url, found: true };
            } catch (error) {
                console.log(`Error processing product ${productId} from Mercado Libre:`, error);
                return { found: false }
            }
        } else {
            console.log('No matching product found for the given productId on Mercado Libre:', productId);
        }

    } catch (error) {
        console.error('Error in getMercadoLibreProduct:', error);
        return { found: false, error: error.message };
    }
};

module.exports = scrapingMercadoLibre;