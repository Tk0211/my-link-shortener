import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '崩鸟',
  description: '免费的在线短链接工具，缩短长链接，生成二维码，方便分享到微信、微博等平台。',
  keywords: '短链接, 短网址, 链接缩短, 二维码生成, URL缩短, 免费短链接',
  authors: [{ name: '崩鸟短链' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: '崩鸟 - 短链接生成器',
    description: '免费的在线短链接工具，缩短长链接，还能生成二维码，方便分享到微信、微博等平台。',
    url: 'https://bengniao.cn',
    siteName: '崩鸟',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
