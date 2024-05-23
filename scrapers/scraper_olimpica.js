const { chromium } = require('playwright');

const scrapingOlimpica = async (productName) => {
    const productos = [];
    const browser = await chromium.launch({ channel: 'msedge' });
    const page = await browser.newPage();

    try {
        let index = 0;
        let count = 0;

        while (count < 3) {
            const product = await getOlimpicaProduct(page, productName, index);

            if (product && product.found) {
                productos.push(product);
                count++;
            }

            index++;

        }
    } catch (error) {
        console.error('Error in scrapingOlimpica:', error);
    } finally {
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
        console.log('Scrapping Finished in Olimpica')
    }

    return productos;
};

const getOlimpicaProduct = async (page, productName, productId) => {
    try {
        const searchLink = `https://www.olimpica.com/${productName.replace(/ /g, "%20")}`;
        await page.goto(searchLink, { timeout: 60000 });
        await page.waitForLoadState('domcontentloaded');

        await new Promise(resolve => setTimeout(resolve, 3000));

        const items = await page.$$('a.vtex-product-summary-2-x-clearLink.vtex-product-summary-2-x-clearLink--product-summary', { timeout: 15000 });

        const filteredItems = await Promise.all(items.map(async (item) => {
            const text = (await item.innerText()).toLowerCase().replace(/[\s\u00A0]+/g, " ");
            const words = text.split(' ');
            const productWords = productName.toLowerCase().split(' ');
            const wordCheck = (word, text) => {
                const regex = new RegExp(`\\b${word}\\b`, 'i');
                return regex.test(text);
            };
            const exclusions = ["reacondicionado"];
            if (exclusions.some(exclusion => text.includes(exclusion))) {
                return false;
            }
            return productWords.every(word => words.some(w => wordCheck(word, w)));
        }));

        const finalItems = items.filter((_item, index) => filteredItems[index]);

        if (finalItems.length > productId) {
            try {
                const productUrl = await finalItems[productId].getAttribute('href');
                await page.goto("https://www.olimpica.com" + productUrl)
                await page.waitForLoadState('domcontentloaded');
                await new Promise(resolve => setTimeout(resolve, 5500));

                const seller = "Olimpica";
                const url = page.url();
                const title = await page.$eval('.vtex-store-components-3-x-productNameContainer.vtex-store-components-3-x-productNameContainer--quickview.mv0.t-heading-4', element => element.innerText.trim());
                const price = await page.$eval('.olimpica-dinamic-flags-0-x-currencyContainer', element => element.innerText.trim());
                const image = await page.$eval('.vtex-store-components-3-x-productImageTag.vtex-store-components-3-x-productImageTag--main', element => element.getAttribute('src'));
                let description;
                try {
                    description = await page.$eval('.vtex-store-components-3-x-content.h-auto', element => `<p>${element.textContent.trim()}</p>`);
                } catch (error) {
                    description = '<p>No se encontró descripción</p>';
                }
                let specifications;
                try {
                    const showMore = await page.$(".vtex-disclosure-layout-1-x-trigger--product-specifications");
                    await showMore.click();
                    specifications = await page.$$eval('.vtex-store-components-3-x-specificationsTableRow--product-specifications', rows => {
                        return rows.map(row => {
                            const titleElement = row.querySelector('.vtex-store-components-3-x-specificationItemProperty--product-specifications div');
                            const valueElement = row.querySelector('.vtex-store-components-3-x-specificationItemSpecifications--product-specifications div');

                            if (titleElement && valueElement) {
                                const title = titleElement.innerText.trim();
                                const text = valueElement.innerText.trim();
                                return `<li>${title}: ${text}</li>`;
                            } else {
                                return '';
                            }
                        }).join('');
                    });
                    specifications = `<ul>${specifications}</ul>`;
                } catch {
                    specifications = '<p>No se encontraron especificaciones</p>';
                }

                return { title, price, image, description, specifications, seller, url, found: true };
            } catch (error) {
                console.log(`Error processing product ${productId} from Olimpica:`, error);
                return { found: false }
            }
        } else {
            console.log('No matching product found for the given productId on Olimpica:', productId);
        }

    } catch (error) {
        console.error('Error in getOlimpicaProduct:', error);
        return { found: false, error: error.message };
    }
};

module.exports = scrapingOlimpica;
