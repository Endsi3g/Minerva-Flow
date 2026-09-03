import React from "react";
import SquareSvg from "@thesvg/react/square";
import GoogleSvg from "@thesvg/react/google";
import GoogleWorkspaceSvg from "@thesvg/react/google-workspace";
import GoogleCalendarSvg from "@thesvg/react/google-calendar";
import GoogleSheetsSvg from "@thesvg/react/google-sheets";
import GoogleDriveSvg from "@thesvg/react/google-drive";
import GmailSvg from "@thesvg/react/gmail";
import GoogleAnalyticsSvg from "@thesvg/react/google-analytics";
import GoogleAdsSvg from "@thesvg/react/google-ads";
import MetaSvg from "@thesvg/react/meta";
import InstagramSvg from "@thesvg/react/instagram";
import StripeSvg from "@thesvg/react/stripe";
import AppleSvg from "@thesvg/react/apple";
import MicrosoftSvg from "@thesvg/react/microsoft";
import UberEatsSvg from "@thesvg/react/uber-eats";
import QuickBooksSvg from "@thesvg/react/quickbooks";
import XeroSvg from "@thesvg/react/xero";
import SageSvg from "@thesvg/react/sage";
import PayPalSvg from "@thesvg/react/paypal";
import ApplePaySvg from "@thesvg/react/apple-pay";
import GooglePaySvg from "@thesvg/react/google-pay";
import GoogleMapsSvg from "@thesvg/react/google-maps";

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

export function GoogleWorkspace({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleWorkspaceSvg width={w} height={h} className={className} {...props} />;
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

export function Instagram({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <InstagramSvg width={w} height={h} className={className} {...props} />;
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

export function QuickBooks({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <QuickBooksSvg width={w} height={h} className={className} {...props} />;
}

export function Xero({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <XeroSvg width={w} height={h} className={className} {...props} />;
}

export function Sage({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <SageSvg width={w} height={h} className={className} {...props} />;
}

export function PayPal({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <PayPalSvg width={w} height={h} className={className} {...props} />;
}

export function ApplePay({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <ApplePaySvg width={w} height={h} className={className} {...props} />;
}

export function GooglePay({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GooglePaySvg width={w} height={h} className={className} {...props} />;
}

export function GoogleMaps({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return <GoogleMapsSvg width={w} height={h} className={className} {...props} />;
}

export function Pennylane({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#0A192F" />
      <path
        d="M7 6H13.5C15.9853 6 18 8.01472 18 10.5C18 12.9853 15.9853 15 13.5 15H9.5V18H7V6Z"
        fill="#0052FF"
      />
      <circle cx="11.5" cy="10.5" r="2" fill="#FFFFFF" />
    </svg>
  );
}

export function Clover({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="7.5" height="7.5" rx="3.75" fill="#00853E" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="3.75" fill="#00853E" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="3.75" fill="#00853E" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="3.75" fill="#00853E" />
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

export function Lightspeed({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M6 3H10V15H18V19H6V3Z"
        fill="#ED1C24"
      />
      <circle cx="17" cy="7" r="3" fill="#ED1C24" />
    </svg>
  );
}

export function Moneris({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="24" height="24" rx="4.5" fill="#0057B8" />
      <path
        d="M6 17V7L9.5 12.5L12 8.5L14.5 12.5L18 7V17H15.5V11L13.25 14.5H10.75L8.5 11V17H6Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function FreshBooks({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <rect width="32" height="32" rx="7" fill="#0075DD" />
      <path
        d="M23.5 9.5L16.2 16.8C15.8 17.2 15.2 17.2 14.8 16.8L12.5 14.5C12.1 14.1 11.5 14.1 11.1 14.5L8.5 17.1C8.1 17.5 8.1 18.1 8.5 18.5L14.8 24.8C15.2 25.2 15.8 25.2 16.2 24.8L26.5 14.5C26.9 14.1 26.9 13.5 26.5 13.1L24.9 9.5C24.6 9.1 23.9 9.1 23.5 9.5Z"
        fill="#80C342"
      />
      <path
        d="M17.5 8.5L9.5 16.5C9.1 16.9 9.1 17.5 9.5 17.9L11.5 19.9C11.9 20.3 12.5 20.3 12.9 19.9L20.5 12.3C20.9 11.9 20.9 11.3 20.5 10.9L18.9 8.5C18.6 8.1 17.9 8.1 17.5 8.5Z"
        fill="white"
      />
    </svg>
  );
}

export function Dext({ size = 20, width, height, className, ...props }: BrandIconProps) {
  const w = width || size;
  const h = height || size;
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <rect width="32" height="32" rx="7" fill="#FF5200" />
      <path
        d="M9 8H16.5C21.1944 8 25 11.8056 25 16.5C25 21.1944 21.1944 25 16.5 25H9V8Z"
        fill="white"
      />
      <path
        d="M14 12H16.2C18.851 12 21 14.149 21 16.8C21 19.451 18.851 21.6 16.2 21.6H14V12Z"
        fill="#FF5200"
      />
    </svg>
  );
}
