const { chromium } = require('playwright');

const scrappingAlkosto = async (productName) => {
    const productos = [];
    let index = 0;
    let count = 0;

    while (count < 5) {
        const product = await getAlkostoProduct(productName, index);

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

const getAlkostoProduct = async (productName, productId) => {

    try {
        const browser = await chromium.launch({ headless: true, slowMo: 500 });
        const page = await browser.newPage();

        const originalProductName = productName.trim();

        const searchLink = `https://www.alkosto.com/search?text=${productName.replace(/ /g, "+")}`;

        await page.goto(searchLink, { timeout: 60000 });
        await page.waitForLoadState('networkidle');


        await new Promise(resolve => setTimeout(resolve, 3000));

        const items = await page.$$('.product__item__top__title.js-algolia-product-click.js-algolia-product-title');

        const filteredItems = await Promise.all(items.map(async (item) => {
            const text = (await item.innerText()).toLowerCase().replace(/[\s\u00A0]+/g, " ");
            return originalProductName.toLowerCase().split(' ');
            //.every(word => text.includes(word)) // searchs are 1:1 
        }));

        const finalItems = items.filter((_item, index) => filteredItems[index]);

        if (finalItems.length > productId) {
            try {
                await finalItems[productId].click();
                await new Promise(resolve => setTimeout(resolve, 5500));
                await page.waitForLoadState('domcontentloaded');

                const title = await page.$eval('.new-container__header__title', el => el.innerText.trim());
                const price = await page.$eval('#js-original_price', el => el.innerText.replace(/\s/g, '').replace('Hoy', ''));
                const image = "https://www.alkosto.com" + await page.$eval('.owl-lazy.js-zoom-desktop-new', el => el.getAttribute('src'));
                const description = await page.$eval('#wc-product-characteristics', el => `<p>${el.innerHTML}</p>`);
                const specifications = await page.$eval('.tab-details__keyFeatures--list', el => `<ul>${el.innerHTML}</ul>`)
                    .catch(async () => `<p>${await page.$eval('.new-container__table__classifications___type__wrap.new-container__table__classifications___type__wrap--mobile', el => el.innerText.trim())}</p>`);
                const url = page.url();

                await browser.close();
                return { title, price, image, description, specifications, url, found: true };
            } catch (error) {
                console.log(`Error processing product ${productId} from Alkosto:`, error);
            }
        } else {
            console.log('No matching product found for the given productId:', productId);
        }

        await browser.close();
        return { found: false };
    } catch (error) {
        console.error('Error in getAlkostoProduct:', error);
        return { found: false, error: error.message };
    }

};

module.exports = scrappingAlkosto;
