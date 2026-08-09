export const SITE = {
  title: 'EagMore',
  subtitle: "I'm still waiting for you.",
  description: 'Self blog.',
  author: 'BrokenShine',
  url: 'https://BrokenShine.codeberg.page',
  language: 'zh-cn',
} as const;

export const MENU = [
  { label: 'Home', href: '/' },
  { label: 'Archives', href: '/archives' },
  { label: 'Tags', href: '/tags' },
  { label: 'Categories', href: '/categories' },
  { label: 'Codeberg', href: 'https://codeberg.org/BrokenShine' },
  { label: 'Gitee', href: 'https://gitee.com/brokenshine' },
  { label: 'GitHub', href: 'https://github.com/hejianxian' },
  { label: 'Bilibili', href: 'https://space.bilibili.com/310949242' },
] as const;

export const RSS = '/atom.xml';

export const EXCERPT_LENGTH = 220;

export const PALETTE = {
  default: 'gruvbox-dark-hard',
  schemes: [
    { id: 'gruvbox-dark-hard', name: 'Gruvbox Dark Hard', signature: '#fe8019', variant: 'dark' },
    { id: 'nord', name: 'Nord', signature: '#88c0d0', variant: 'dark' },
    { id: 'solarized-dark', name: 'Solarized Dark', signature: '#2aa198', variant: 'dark' },
    { id: 'dracula', name: 'Dracula', signature: '#ea51b2', variant: 'dark' },
    { id: 'one-dark', name: 'One Dark', signature: '#61afef', variant: 'dark' },
    { id: 'default-light', name: 'Default Light', signature: '#7cafc2', variant: 'light' },
  ],
} as const;

export const GLOBE = { enabled: true, fps: 18 } as const;
