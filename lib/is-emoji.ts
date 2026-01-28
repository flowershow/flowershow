import emojiRegex from 'emoji-regex';

const regex = emojiRegex();

export function isEmoji(str: string) {
  const match = str.match(regex);
  return match !== null && match[0] === str;
}
