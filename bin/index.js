#!/usr/bin/env node

const puppeteer = require('puppeteer');
const sites = require('../sites.json');
const { checkSite } = require('../src/checkSite');
const config = require('../config.json');

(async () => {
  let launchOptions = { headless: false };
  if (config && config.runHeadless) {
    launchOptions = {
      headless: true,
      args: ['--no-sandbox', "--window-size=1920,1080"],
      defaultViewport: null
    };
  }

  const browser = await puppeteer.launch(launchOptions);
  try {
    var sitePromises = []
    for (let index = 0; index < sites.length; index += 1) {
      const page = await browser.newPage();
      await page._client.send('Emulation.clearDeviceMetricsOverride');
      // making it wait for each loop on purpose to let previous chrome tab finish
      const pagePromise = checkSite(sites[index], page)
      pagePromise.then( () => {
        page.close()
      });
      sitePromises.push(pagePromise);
    }

    await Promise.all(sitePromises)
  } finally {
    // close the browser
    await browser.close();
  }
})();
