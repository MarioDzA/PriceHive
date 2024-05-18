const { chromium } = require('playwright');

const scrapingFalabella = async (productName) => {
    const productos = [];
    let index = 0;
    let count = 0;

    while (count < 5) {
        const product = await getFalabellaProduct(productName, index);

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

const getFalabellaProduct = async (productName, productId) => {
    try {
        const browser = await chromium.launch({ headless: false, slowMo: 500 });
        const page = await browser.newPage();

        const searchLink = `https://www.falabella.com.co/falabella-co/search?Ntt=${productName.replace(/ /g, "+")}`;

        await page.goto(searchLink, { timeout: 60000 });
        await page.waitForLoadState('domcontentloaded');

        const buttonText = await page.$eval('.copy3', element => element.innerText.trim());

        if (buttonText !== 'Recomendados') {
            await page.click('.copy3');
            await page.waitForTimeout(3000);
            await page.click("button:text('Recomendados')");
            await page.waitForLoadState('domcontentloaded');
        }

        await new Promise(resolve => setTimeout(resolve, 3000));

        const items = await page.$$('.jsx-2481219049');

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

                const url = page.url();
                const seller = "Falabella"
                const title = await page.$eval('.jsx-1680787435', element => element.innerText.trim());
                const price = await page.$eval('.copy12', element => element.innerText.trim())
                const image = await page.$eval('.jsx-2657190317 img', element => element.getAttribute('src'));
                let description;
                try {
                    description = await page.$eval('.fb-product-information-tab__copy', element => element.innerText.trim());
                } catch {
                    description = 'No se encontró descripción';
                }
                let specifications = '';
                try {
                    specifications = await page.$$eval('tr.jsx-960159652', elements => {
                        return elements.map(element => {
                            const title = element.querySelector('td.jsx-960159652.property-name').innerText.trim();
                            const text = element.querySelector('td.jsx-960159652.property-value').innerText.trim();
                            return `<li>${title}: ${text}</li>`;
                        }).join('');
                    });
                    specifications = `<ul>${specifications}</ul>`;
                } catch {
                    specifications = 'No se encontraron especificaciones';
                }

                await browser.close();
                return { title, price, image, description, specifications, seller, url, found: true };
            } catch (error) {
                await browser.close();
                console.log(`Error processing product ${productId} from Falabella:`, error);
            }

        } else {
            await browser.close();
            console.log('No matching product found for the given productId:', productId);
        }

    } catch (error) {
        console.error('Error in getFalabellaProduct:', error);
        await browser.close();
        return { found: false, error: error.message };
    }
};

module.exports = scrapingFalabella;