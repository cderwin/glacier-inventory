<template>
  <div class="glacier-search">
    <input
      ref="input"
      v-model="query"
      type="search"
      class="glacier-search-input"
      placeholder="Search glaciers by name"
      aria-label="Search glaciers by name"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open ? 'true' : 'false'"
      aria-controls="glacier-search-list"
      :aria-activedescendant="activeOptionId"
      autocomplete="off"
      spellcheck="false"
      :disabled="disabled"
      @focus="open = true"
      @blur="open = false"
      @input="onInput"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="choose(suggestions[active])"
      @keydown.esc.prevent="onEscape"
    />

    <div v-if="open" class="glacier-search-popover">
      <p class="glacier-search-heading">
        {{ searching ? 'Matching names' : 'Nearest to map center' }}
      </p>
      <ul
        v-if="suggestions.length"
        id="glacier-search-list"
        role="listbox"
        class="glacier-search-list"
      >
        <li
          v-for="(group, index) in suggestions"
          :id="optionId(group)"
          :key="group.id"
          role="option"
          :aria-selected="index === active ? 'true' : 'false'"
          class="glacier-search-option"
          :class="{ 'glacier-search-option--active': index === active }"
          @mousedown.prevent="choose(group)"
          @mousemove="active = index"
        >
          <span class="glacier-search-name">{{ group.name }}</span>
          <span class="glacier-search-detail">{{ detail(group) }}</span>
        </li>
      </ul>
      <p v-else-if="searching" class="glacier-search-empty">
        No {{ hiddenClasses.length ? 'shown glaciers' : 'names' }} match “{{ query.trim() }}”.
      </p>
      <p v-else class="glacier-search-empty">No named glaciers are shown.</p>
    </div>
  </div>
</template>

<script>
const MAX_SUGGESTIONS = 8;

// Approximate ground distance in km between two [lon, lat] points. Accurate
// enough to rank nearby glaciers.
function distanceKm(a, b) {
  const meanLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111.32 * Math.cos(meanLat);
  const dy = (b[1] - a[1]) * 110.57;
  return Math.sqrt(dx * dx + dy * dy);
}

function formatKm(km) {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

// Groups entries by name and region. A glacier split into pieces becomes one
// suggestion; namesakes in different ranges stay separate. The group's
// centroid is the area-weighted mean of its pieces' centroids, which is the
// centroid of the pieces combined, since they don't overlap.
function groupEntries(entries, hiddenClasses) {
  const groups = [];
  const byKey = {};
  entries.forEach(entry => {
    if (hiddenClasses.indexOf(entry.className) !== -1) return;
    const key = `${entry.name}\n${entry.region}`;
    let group = byKey[key];
    if (!group) {
      group = byKey[key] = {
        // The first piece's feature id is unique across groups.
        id: entry.id,
        name: entry.name,
        key: entry.key,
        region: entry.region,
        classes: [],
        pieces: 0,
        areaKm2: 0,
        momentLon: 0,
        momentLat: 0,
        bbox: entry.bbox.slice()
      };
      groups.push(group);
    }
    if (group.classes.indexOf(entry.className) === -1) group.classes.push(entry.className);
    group.pieces += 1;
    group.areaKm2 += entry.areaKm2;
    group.momentLon += entry.centroid[0] * entry.areaKm2;
    group.momentLat += entry.centroid[1] * entry.areaKm2;
    group.bbox[0] = Math.min(group.bbox[0], entry.bbox[0]);
    group.bbox[1] = Math.min(group.bbox[1], entry.bbox[1]);
    group.bbox[2] = Math.max(group.bbox[2], entry.bbox[2]);
    group.bbox[3] = Math.max(group.bbox[3], entry.bbox[3]);
  });
  return groups.map(group =>
    Object.freeze({
      id: group.id,
      name: group.name,
      key: group.key,
      region: group.region,
      classes: group.classes.sort(),
      pieces: group.pieces,
      areaKm2: group.areaKm2,
      centroid: [group.momentLon / group.areaKm2, group.momentLat / group.areaKm2],
      bbox: group.bbox
    })
  );
}

// Search box with a suggestion list. With an empty query it suggests the
// named glaciers nearest `center`; otherwise glaciers whose names match.
// Classes in `hiddenClasses` are left out. Emits `select` with the chosen
// group ({ name, region, centroid, bbox, ... }); the parent moves the map.
export default {
  name: 'GlacierSearch',

  props: {
    // Frozen array of named features:
    // { id, name, key, className, region, areaKm2, centroid, bbox }.
    // `key` is the lower-cased name.
    entries: { type: Array, required: true },
    // Map center as [lon, lat].
    center: { type: Array, default: null },
    // Classes switched off in the legend.
    hiddenClasses: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false }
  },

  data() {
    return {
      query: '',
      open: false,
      active: 0
    };
  },

  computed: {
    searching() {
      return this.query.trim() !== '';
    },

    groups() {
      return groupEntries(this.entries, this.hiddenClasses);
    },

    suggestions() {
      const query = this.query.trim().toLowerCase();
      const center = this.center;
      const ranked = [];
      this.groups.forEach(group => {
        // Rank: name starts with the query, then a word does, then any match.
        let rank = 0;
        if (query) {
          const at = group.key.indexOf(query);
          if (at === -1) return;
          rank = at === 0 ? 0 : group.key.charAt(at - 1) === ' ' ? 1 : 2;
        }
        const distance = center ? distanceKm(center, group.centroid) : 0;
        ranked.push({ group, rank, distance });
      });
      ranked.sort(
        (a, b) => a.rank - b.rank || a.distance - b.distance || a.group.name.localeCompare(b.group.name)
      );
      return ranked
        .slice(0, MAX_SUGGESTIONS)
        .map(item => Object.assign({ distance: item.distance }, item.group));
    },

    activeOptionId() {
      const group = this.suggestions[this.active];
      return this.open && group ? this.optionId(group) : null;
    }
  },

  methods: {
    onInput() {
      this.open = true;
      this.active = 0;
    },

    // The browser's own Escape handling in a search input clears the text,
    // which fires `input` and would reopen the list. Escape closes the list
    // first, and clears the query on a second press.
    onEscape() {
      if (this.open) {
        this.open = false;
      } else {
        this.query = '';
      }
    },

    move(step) {
      if (!this.open) {
        this.open = true;
        return;
      }
      const count = this.suggestions.length;
      if (count) this.active = (this.active + step + count) % count;
    },

    choose(group) {
      if (!group) return;
      this.query = group.name;
      this.open = false;
      this.active = 0;
      this.$emit('select', group);
    },

    optionId(group) {
      return `glacier-search-option-${group.id}`;
    },

    detail(group) {
      // Namesakes in other ranges share a name, so matches show the region.
      const where = this.searching || !this.center ? group.region : `${formatKm(group.distance)} away`;
      const parts = [where, group.classes.join(' + '), `${group.areaKm2.toFixed(3)} km²`];
      if (group.pieces > 1) parts.push(`${group.pieces} pieces`);
      return parts.join(' · ');
    }
  }
};
</script>

<style>
.glacier-search {
  position: relative;
  width: 20rem;
  max-width: 100%;
  margin-bottom: 0.4rem;
}

.glacier-search-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

.glacier-search-input:focus {
  outline: 2px solid var(--text-muted);
  outline-offset: -1px;
}

.glacier-search-input:disabled {
  opacity: 0.6;
}

.glacier-search-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.glacier-search-heading,
.glacier-search-empty {
  margin: 0;
  padding: 0.35rem 0.6rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.glacier-search-heading {
  border-bottom: 1px solid var(--border);
}

.glacier-search-list {
  max-height: 18rem;
  margin: 0;
  padding: 0.2rem 0;
  overflow-y: auto;
  list-style: none;
}

.glacier-search-option {
  display: flex;
  flex-direction: column;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.glacier-search-option--active {
  background: var(--border);
}

.glacier-search-name {
  color: var(--text);
}

.glacier-search-detail {
  color: var(--text-muted);
  font-size: 0.75rem;
}
</style>
