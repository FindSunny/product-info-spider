// @ts-nocheck
'use strict';

const puppeteer = require('puppeteer');
/**
 * 抽取京东数据
 */
async function jd() {
    const browser = await puppeteer.launch({
        headless: false,
    });
    const page = await browser.newPage();

    // 测试页面：https://search.jd.com/Search?keyword=only&enc=utf-8&wq=only&pvid=d691634b78874896a809b6ca7d4dd211
    await page.goto('https://search.jd.com/Search?keyword=only&enc=utf-8&wq=only&pvid=d691634b78874896a809b6ca7d4dd211');

    // 等待页面加载完成
    await page.waitForSelector('.gl-warp');

    // 滚动条滚动, 加载更多数据
    await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
    });

    // 等待页面加载完成
    await page.waitForSelector('.gl-warp');

    // 获取页面数据
    const data = await page.evaluate(() => {
        const items = document.querySelectorAll('.gl-item');
        const result = [];
        items.forEach(item => {
            const title = item.querySelector('.p-name').innerText;
            const price = item.querySelector('.p-price').innerText;
            const shop = item.querySelector('.p-shop').innerText;
            const url = item.querySelector('.p-img a').href;
            result.push({
                title,
                price,
                shop,
                url
            });
        });
        return result;
    });

    console.log(data);

    // 详细数据

    // 循环打开每个商品详情页
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const page = await browser.newPage();
        await page.goto(item.url);
        await page.waitForSelector('.sku-name');
        const detail = await page.evaluate(() => {
            const title = document.querySelector('.sku-name').innerText;
            const price = document.querySelector('.p-price').innerText;
            const shop = document.querySelector('.crumb-wrap .item a').innerText;
            // 商品介绍
            const desc = document.querySelector('#detail .tab-con').innerText;
            // 品牌
            const brand = document.querySelector('.parameter2 li').innerText;
            // 商品编号
            const num = document.querySelector('.parameter2 li:nth-child(2)').innerText;
            return {
                title,
                price,
                shop,
                desc,
                brand,
                num
            };
        });
        item.detail = detail;
        console.log(detail);
        await page.close();
    }

    await browser.close();
}

/**
 * 抽取淘宝数据
 */
async function taobao() {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage();
    // 登录页面
    await page.goto('https://login.taobao.com/');
    // 测试页面：https://s.taobao.com/search?q=ONLY&commend=all&ssid=s5-e&search_type=item&sourceId=tb.index&spm=a21bo.jianhua.201856-taobao-item.2&ie=utf8&initiative_id=tbindexz_20170306
    await page.goto('https://s.taobao.com/search?q=ONLY&commend=all&ssid=s5-e&search_type=item&sourceId=tb.index&spm=a21bo.jianhua.201856-taobao-item.2&ie=utf8&initiative_id=tbindexz_20170306');
    // 等待页面加载完成
    await page.waitForSelector('.m-itemlist');
    // 滚动条滚到底部
    await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
    });

    // 等待页面加载完成
    await page.waitForSelector('.m-itemlist');
    // 获取页面数据
    const data = await page.evaluate(() => {
        const items = document.querySelectorAll('.m-itemlist .items .item');
        const result = [];
        items.forEach(item => {
            const title = item.querySelector('.row-2.title a').innerText.replace(/<[^>]+>/g, '');
            const price = item.querySelector('.row-1 .price strong').innerText
            const shop = item.querySelector('.row-3 .shop  > a >span:nth-child(2)').innerText;
            const url = item.querySelector('.row-2 a').href;
            result.push({
                title,
                price,
                shop,
                url
            });
        });
        return result;
    });
    console.log(data);

    // 循环获取每个商品详情页 TODO
    // for (let i = 0; i < data.length; i++) {
    //     const item = data[i];
    //     const page = page.goto(item.url);
    //     await page.waitForSelector('#detail');
    //     const detail = await page.evaluate(() => {
    //         // 商品介绍
    //         const desc = document.querySelector('#detail .attributes-list').innerText;
    //         // 品牌
    //         const brand = document.querySelector('#detail .attributes-list li:nth-child(1)').innerText;
    //         // 商品编号
    //         const num = document.querySelector('#detail .attributes-list li:nth-child(2)').innerText;
    //         return {
    //             desc,
    //             brand,
    //             num
    //         };
    //     });
    //     item.detail = detail;
    //     console.log(detail);
    // }

    browser.close();
}

(async () => {
    // await jd();
    await taobao();
})();