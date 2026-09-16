// The inventory's three feature classes and their map colors. One source of
// truth: InventoryMap builds its paint expressions and legend from this, and
// About shows the same swatches.
export const CLASS_COLORS = {
  Glacier: '#2f80ed',
  'Perennial snowfield': '#56ccf2',
  'Buried ice': '#9b51e0'
};

// Anything outside CLASS_COLORS, which the published inventory has none of.
export const OTHER_COLOR = '#828282';
