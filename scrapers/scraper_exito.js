const { chromium } = require('playwright');

const scrapingExito = async (productName) => {
    const productos = [];
    const browser = await chromium.launch({ headless: true});
    const page = await browser.newPage();

    try {
        let index = 0;
        let count = 0;

        while (count < 2) {
            const product = await getExitoProduct(page, productName, index);
            if (!product || !product.found) break;

            productos.push(product);
            count++;
            index++;

            if (index - count > 3) break;
        }
    } catch (error) {
        console.error('Error in scrapingExito:', error);
    } finally {
        await browser.close();
        console.log('Scrapping Finished in Éxito')
    }

    return productos;
};

const getExitoProduct = async (page, productName, productId) => {
    try {
        const searchLink = `https://www.exito.com/s?q=${productName.replace(/ /g, "+")}`;
        await page.goto(searchLink);
        await page.waitForLoadState('domcontentloaded');

        await new Promise(resolve => setTimeout(resolve, 3000));

        const items = await page.$$('.link_fs-link__J1sGD');

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
                const seller = "Éxito"
                const title = await page.$eval('.product-title_product-title__heading___mpLA', element => element.innerText.trim());
                const price = await page.$eval('.ProductPrice_container__price__XmMWA', element => element.innerText.trim())
                const image = await page.$eval('.ImgZoom_ContainerImage__0r4y9 img', element => element.getAttribute('src'));
                let description;
                try {
                    description = await page.$eval('div[data-fs-description-text=true]', element => element.innerText.trim());
                } catch {
                    description = 'No se encontró descripción';
                }
                let specifications = '';
                try {
                    specifications = await page.$$eval('div[data-fs-specification-gray-block="true"]', elements => {
                        return elements.map(element => {
                            const title = element.querySelector('p[data-fs-title-specification="true"]').innerText.trim();
                            const text = element.querySelector('p[data-fs-text-specification="true"]').innerText.trim();
                            return `<li>${title}: ${text}</li>`;
                        }).join('');
                    });
                } catch {
                    specifications = 'No se encontraron especificaciones';
                }
                if(specifications == '<ul></ul>'){
                    specifications = 'No se encontraron especificaciones';
                }
                specifications = `<ul>${specifications}</ul>`;
                if(specifications == '<ul><li>Referencia: SIN REF</li></ul>'){
                    specifications = 'No se encontraron especificaciones';
                }

    
                return { title, price, image, description, specifications, seller, url, found: true };
            } catch (error) {
                console.log(`Error processing product ${productId} from Éxito:`, error);
            }

        } else {
            console.log('No matching product found for the given productId on Éxito:', productId);
        }

    } catch (error) {
        console.error('Error in getExitoProduct:', error);
        return { found: false, error: error.message };
    }
};

module.exports = scrapingExito;