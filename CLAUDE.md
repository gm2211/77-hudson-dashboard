# Claude Agent Notes

## Auto-Scrolling Implementation (Dashboard.tsx)

**DO NOT BREAK THE SCROLLING AGAIN!**

The events auto-scroll in `AutoScrollCards` component requires specific CSS and JS patterns:

### CSS Requirements
1. **Wrapper must be `position: relative`** with `flex: 1` and `minHeight: 0`
2. **Scroll container must be `position: absolute`** with `top/left/right/bottom: 0`
3. This gives the scroll container a definite height, which is required for `overflow: auto` to work inside flexbox

### JS Requirements
1. **Accumulate fractional pixels** - browsers ignore sub-pixel `scrollTop` values
2. **Only scroll when accumulated >= 1px** - use `Math.floor()` to get whole pixels
3. **Use `scrollBy({ top, behavior: 'instant' })`** - not direct `scrollTop` assignment
4. Content is duplicated (`[...events, ...events]`) for seamless looping
5. When `scrollTop >= contentHeight/2`, jump back by subtracting `contentHeight`

### Why This Matters
Without these patterns, `scrollTop` will stay at 0 even though manual scrolling works. The browser silently rejects the scroll attempts.
