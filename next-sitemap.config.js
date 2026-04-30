/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://example.com',
  generateRobotsTxt: true,
  // Optional: exclude super-admin and clinic dashboard from sitemap
  exclude: ['/super-admin*', '/clinic*'],
}
