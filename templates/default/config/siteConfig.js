const defaultConfig = {
  title: 'Flowershow',
  description: 'Publish your digital garden', 
  author: 'Flowershow',
  // logo image
  authorLogo: '/images/logo.svg',
  // url to author
  authorUrl: 'https://flowershow.app/',
  // Google analytics key e.g. G-XXXX
  analytics: '',
  // content source directory for markdown files
  content: process.env.FLOWERSHOW_CONTENT || 'content',
  // Theme
  navLinks: [
    { href: '/about', name: 'About' },
  ],
  // optional additional nextSeo content set on each page
  // see https://github.com/garmeeh/next-seo
//  nextSeo: {
//    openGraph: {
//      images: [
//        {
//          url: 'https://image.url/...',
//          alt: '',
//          width: 1200,
//          height: 627,
//          type: 'image/png',
//        }
//      ]
//    }
//  }
}

import userConfig from '../content/config.js'

const siteConfig = Object.assign({}, defaultConfig, userConfig)

module.exports = siteConfig
