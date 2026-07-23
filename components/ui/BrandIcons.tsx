import React from "react";
import SquareSvg from "@thesvg/react/square";
import GoogleSvg from "@thesvg/react/google";
import GoogleCalendarSvg from "@thesvg/react/google-calendar";
import GoogleSheetsSvg from "@thesvg/react/google-sheets";
import GoogleDriveSvg from "@thesvg/react/google-drive";
import GmailSvg from "@thesvg/react/gmail";
import GoogleAnalyticsSvg from "@thesvg/react/google-analytics";
import GoogleAdsSvg from "@thesvg/react/google-ads";
import MetaSvg from "@thesvg/react/meta";
import StripeSvg from "@thesvg/react/stripe";
import AppleSvg from "@thesvg/react/apple";
import MicrosoftSvg from "@thesvg/react/microsoft";
import UberEatsSvg from "@thesvg/react/uber-eats";

interface BrandIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  width?: number;
  height?: number;
}

export function Square({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <SquareSvg width={w} height={h} className={className} {...props} />;
}

export function Google({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleSvg width={w} height={h} className={className} {...props} />;
}

export function GoogleCalendar({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleCalendarSvg width={w} height={h} className={className} {...props} />;
}

export function GoogleSheets({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleSheetsSvg width={w} height={h} className={className} {...props} />;
}

export function GoogleDrive({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleDriveSvg width={w} height={h} className={className} {...props} />;
}

export function Gmail({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GmailSvg width={w} height={h} className={className} {...props} />;
}

export function GoogleAnalytics({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleAnalyticsSvg width={w} height={h} className={className} {...props} />;
}

export function GoogleAds({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleAdsSvg width={w} height={h} className={className} {...props} />;
}

export function Meta({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <MetaSvg width={w} height={h} className={className} {...props} />;
}

export function Stripe({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <StripeSvg width={w} height={h} className={className} {...props} />;
}

export function Apple({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <AppleSvg width={w} height={h} className={className} {...props} />;
}

export function Microsoft({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <MicrosoftSvg width={w} height={h} className={className} {...props} />;
}

export function UberEats({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <UberEatsSvg width={w} height={h} className={className} {...props} />;
}
