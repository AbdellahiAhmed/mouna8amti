# MNT brand guide

<img src="mnt-tile/mark.svg" width="96" alt="MNT logo" />

**MNT** is the short form of **منظمتي** (*my organisation*). The identity comes from the validated Claude Design reference for the product.

## Mark

The letters M, N and T are drawn as **one continuous stroke** inside a rounded tile (36 grid, corner radius 10, stroke 2.6, square caps and mitred joins). The Arabic wordmark منظمتي is set in Readex Pro SemiBold next to the tile.

## Colour

| | Value | Use |
|---|---|---|
| **Deep green** | `#0E5A44` | The only brand colour: tile, actions, focus |
| Night green | `#0A3D2F` | Login ground, headings on brand surfaces |
| Soft green | `#E6F2EC` | Active navigation, selected rows |
| White | `#FFFFFF` | Monogram on the tile |

White on deep green reaches **8.2:1** contrast (WCAG AAA). One colour, no gradient. Login and hero surfaces may carry the topographic contour texture (`apps/web/src/components/brand/topo-lines.tsx`) at 7–8 % white.

## Files

| File | Use |
|---|---|
| `mnt-tile/mark.svg` | Default: white monogram on the green tile |
| `mnt-tile/mark-light.svg` | On dark green: green monogram on a white tile |
| `mnt-tile/mark-512.png` | Raster for slides and social cards |
| `mnt-tile/apple-icon.png`, `favicon.ico` | App icon and favicon (also copied to `apps/web/src/app/`) |

In the app, use `<Logo />` or `<LogoMark />` from `apps/web/src/components/brand/logo.tsx`; pass `tone="light"` on dark backgrounds.
