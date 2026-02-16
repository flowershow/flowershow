import { micromark } from 'micromark';
import { syntax } from '../dist/index.js';

const htmlExt = {
  enter: {
    wikiLink: (token) => console.log('▶ enter wikiLink', token),
    wikiLinkData: (token) => console.log('▶ enter wikiLinkData', token),
    wikiLinkTarget: (token) => console.log('▶ enter wikiLinkTarget', token),
    wikiLinkAliasMarker: (token) =>
      console.log('▶ enter wikiLinkAliasMarker', token),
    wikiLinkAlias: (token) => console.log('▶ enter wikiLinkAlias', token),
    wikiLinkMarker: (token) => console.log('▶ enter wikiLinkMarker', token),
    embed: (token) => console.log('▶ enter wikiEmbed', token),
    embedMarker: (token) => console.log('▶ enter embedMarker', token),
  },
  exit: {
    wikiLink: (token) => console.log('◀ exit  wikiLink', token),
    wikiLinkData: (token) => console.log('◀ exit  wikiLinkData', token),
    wikiLinkTarget: (token) => console.log('◀ exit  wikiLinkTarget', token),
    wikiLinkAliasMarker: (token) =>
      console.log('◀ exit  wikiLinkAliasMarker', token),
    wikiLinkAlias: (token) => console.log('◀ exit  wikiLinkAlias', token),
    wikiLinkMarker: (token) => console.log('◀ exit  wikiLinkMarker', token),
    embed: (token) => console.log('◀ exit  wikiEmbed', token),
    embedMarker: (token) => console.log('◀ exit  embedMarker', token),
  },
};

for (const input of ['[[PageName]]', '[[PageName|Alias]]', '![[ImageName]]']) {
  console.log('\n=====', input, '=====');
  micromark(input, 'ascii', {
    extensions: [syntax()],
    htmlExtensions: [htmlExt],
  });
}
