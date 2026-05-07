---
description: Install and use React Bits / React Bits Pro animated components
---

## Setup

1. Ensure `components.json` exists at the project root. For React Bits Pro registry access:
```json
{
  "registries": {
    "@reactbits-starter": {
      "url": "https://pro.reactbits.dev/r",
      "headers": { "X-License-Key": "${REACTBITS_LICENSE_KEY}" }
    },
    "@reactbits-pro": {
      "url": "https://pro.reactbits.dev/r",
      "headers": { "X-License-Key": "${REACTBITS_LICENSE_KEY}" }
    }
  }
}
```

2. Set the license key in shell environment:
```bash
export REACTBITS_LICENSE_KEY=RBPU-5C5B836C-8CE6-4A79-AA47-E7DEC97E3152
```

## Install free components (@react-bits)

Always use the `-TS-TW` suffix for TypeScript + Tailwind:
```bash
npx shadcn@latest add @react-bits/aurora-TS-TW
npx shadcn@latest add @react-bits/gradient-text-TS-TW
npx shadcn@latest add @react-bits/particles-TS-TW
npx shadcn@latest add @react-bits/tilted-card-TS-TW
npx shadcn@latest add @react-bits/spotlight-card-TS-TW
npx shadcn@latest add @react-bits/animated-list-TS-TW
npx shadcn@latest add @react-bits/soft-aurora-TS-TW
```

## Install Pro components (@reactbits-starter)

Use `-tw` suffix:
```bash
npx shadcn@latest add @reactbits-starter/silk-waves-tw
npx shadcn@latest add @reactbits-starter/gradient-carousel-tw
npx shadcn@latest add @reactbits-starter/preloader-tw
```

## Install Pro page section blocks (@reactbits-pro)

No suffix for blocks. Always confirm the variant number first:
```bash
npx shadcn@latest add @reactbits-pro/hero-3
npx shadcn@latest add @reactbits-pro/navigation-1
npx shadcn@latest add @reactbits-pro/pricing-2
npx shadcn@latest add @reactbits-pro/features-1
npx shadcn@latest add @reactbits-pro/footer-1
```

## Import patterns

Free components (default export):
```tsx
import Aurora from "@/components/react-bits/aurora";
```

Pro blocks (named export — PascalCase of slug):
```tsx
import { Hero3 } from "@/components/blocks/hero-3";
import { Pricing2 } from "@/components/blocks/pricing-2";
```

## Key notes

- All components are `"use client"` — never remove this directive
- WebGL components need explicit container dimensions
- Tailwind v4: use `@import "tailwindcss"` in globals.css
- If `cn` is missing: `npm install clsx tailwind-merge` then create `lib/utils.ts`
- Bae4U color palette: pink `#ff2d78`, blue `#3b82f6`, dark bg `#09090b`
