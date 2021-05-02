const { notify } = require('./notify');
const config = require('../config.json');
const fs = require('fs');

function sleep(wait) {
  return new Promise((resolve) => setTimeout(resolve, wait * 1000));
}

const isMatch = (actual, expected) => {
  if (Array.isArray(expected)) return expected.includes(actual);
  return actual === expected;
};

const waitForClicks = async (page, clickXPaths) => {
  for (const xpath of clickXPaths) {
    const [button] = await page.$x(xpath);
    if (typeof button !== 'undefined') {
      await button.click();
    }
  }
}

const checkXPath = async (page, xPath, expected, wait, description) => {
  try {
    await page.waitForXPath(xPath, {timeout: wait * 1000});
    const elHandle = await page.$x(xPath);
    const text = await page.evaluate((el) => el.textContent, elHandle[0]);
    const value = String(text).replace(/^\s+|\s+$/g, "");
    const match = isMatch(value, expected);
    console.log("[%s] Out of stock %s", description, match);
    return match
  } catch (e) {
    console.error("[%s] Exception %s", description, e);
    return false
  }
}

const openSite = async (page, site) => {
  const { url, checks, wait = 1, description, clickXPaths = [] } = site;
  console.log("[%s] Starting", description);
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
  );

  await page.goto(url, {
    waitUntil: 'networkidle2'
  });
}

const checkPage = async (page, site) => {
  const { url, checks, wait = 1, description, clickXPaths = [] } = site;
  var anyMatch = false;
  for (const { xPath, expected } of checks) {
    console.log("[%s] Checking xpath %s", description, xPath);
    const match = await checkXPath(page, xPath, expected, wait, description)
    anyMatch = match & anyMatch
    if (match) { break; }
  }
  return anyMatch
}

const checkSite = async (site, page) => {
  const { url, checks, wait = 1, description, clickXPaths = [] } = site;

  await openSite(page, site)
  try {
    await waitForClicks(page, clickXPaths)
    const anyMatch = await checkPage(page, site)

    if (!anyMatch) {
      await notify({
        site,
        message: `${description} did not find any of the matching values"`,
      });
    }

    
  } catch (e) {
    console.error('[%s] Exception %s', description, e);

    const html = await page.content();
    await fs.promises.writeFile(description + '_page.html', html, { encoding: 'utf8' });
    await page.screenshot({ path: description + '_page.png' });

    if (config && config.notifyOnNodeNotFound) {
      await notify({ site, message: `${description} could not reach the node specified` });
    }
  } finally {
  }
};

module.exports = {
  checkSite,
};
