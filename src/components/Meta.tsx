import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const Meta: React.FC<MetaProps> = ({
  title = 'OmniMarket - Buy & Sell Anything in Ethiopia',
  description = 'The safest and fastest marketplace in Ethiopia. Buy and sell electronics, cars, property, and more.',
  image = 'https://picsum.photos/seed/omnimarket/1200/630',
  url = window.location.href,
  type = 'website',
}) => {
  const siteName = 'OmniMarket';
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
