const { chromium } = require('playwright');

const scrapingAlkosto = async (productName) => {
    const productos = [];
    const browser = await chromium.launch({ headless: true});
    const page = await browser.newPage();

    try {
        let index = 0;
        let count = 0;

        while (count < 2) {
            const product = await getAlkostoProduct(page, productName, index);
            if (!product || !product.found) break;

            productos.push(product);
            count++;
            index++;

            if (index - count > 3) break;
        }
    } catch (error) {
        console.error('Error in scrapingAlkosto:', error);
    } finally {
        await browser.close();
        console.log('Scrapping Finished in Alkosto')
    }

    return productos;
};

const getAlkostoProduct = async (page, productName, productId) => {

    try {
        const searchLink = `https://www.alkosto.com/search?text=${productName.replace(/ /g, "-")}`;
        await page.goto(searchLink);
        await page.waitForLoadState('domcontentloaded');

        await new Promise(resolve => setTimeout(resolve, 3000));

        const items = await page.$$('.product__item__top__title.js-algolia-product-click.js-algolia-product-title');

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

                const seller = "Alkosto";
                const url = page.url();
                const title = await page.$eval('.new-container__header__title', element => element.innerText.trim());
                const price = await page.$eval('#js-original_price', element => element.innerText.replace(/\s/g, '').replace('Hoy', ''));
                const image = "https://www.alkosto.com" + await page.$eval('.owl-lazy.js-zoom-desktop-new', element => element.getAttribute('src'));
                const description = await page.$eval('#wc-product-characteristics', element => `<p>${element.innerHTML}</p>`);
                let specifications;
                try {
                    specifications = await page.$eval('.tab-details__keyFeatures--list', element => {
                        const items = element.innerText.split('\n').map(item => `<li>${item.trim()}</li>`).join('');
                        return `<ul>${items}</ul>`;
                    });
                } catch (error) {
                    try {
                        specifications = await page.$eval('.new-container__table__classifications___type__wrap.new-container__table__classifications___type__wrap--mobile', element => element.innerText.trim());
                    } catch {
                        specifications = 'No se encontraron especificaciones';
                    }
                }

                return { title, price, image, description, specifications, seller, url, found: true };
            } catch (error) {
                console.log(`Error processing product ${productId} from Alkosto:`, error);
            }
        } else {
            console.log('No matching product found for the given productId on Alkosto:', productId);
        }

        return { found: false };
    } catch (error) {
        console.error('Error in getAlkostoProduct:', error);
        return { found: false, error: error.message };
    }

};

module.exports = scrapingAlkosto;
