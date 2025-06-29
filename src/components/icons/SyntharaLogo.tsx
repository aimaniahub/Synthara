import type { ImgHTMLAttributes } from 'react';

// IMPORTANT: Ensure the logo image provided by the user has been saved as
// 'synthara-logo.png' in the 'public' directory of your project.

export function SyntharaLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
  const { className, ...rest } = props;
  return (
    <img
      src="/synthara-logo.png" // This path assumes the image is in YOUR_PROJECT_ROOT/public/synthara-logo.png
      alt="Synthara AI Logo"
      width={282} // Intrinsic width of the provided image, helps with aspect ratio
      height={300} // Intrinsic height of the provided image, helps with aspect ratio
      className={className} // Allows existing Tailwind size classes (e.g., h-10 w-auto) to control the display size
      {...rest}
    />
  );
}
