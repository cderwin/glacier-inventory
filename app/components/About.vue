<template>
  <section class="about">
    <h2>About this map</h2>

    <p class="about-lede">
      This site is a browser viewer for the first complete inventory of glaciers
      and perennial snowfields in the conterminous United States. It draws all
      2,542 mapped features on a Mapbox map: click one to see its attributes,
      search for a glacier by name, or switch a feature type off in the legend.
    </p>

    <p>
      The data and every fact on this page come from Fountain, Glenn, and
      McNeil (2023), published open access in
      <cite>Earth System Science Data</cite>
      (<a :href="articleUrl" target="_blank" rel="noopener">full text</a>).
      This viewer is not affiliated with the authors.
    </p>

    <h3>What the inventory covers</h3>

    <p>
      The inventory maps perennial snow and ice in the mountains of the western
      conterminous US, across Washington, Montana, Wyoming, California, Oregon,
      Colorado, and Idaho. Washington holds the most features and the greatest
      area. Alaska is not included. Features smaller than 0.01 km² were left
      out, a threshold drawn from international glacier inventory practice.
    </p>

    <h3>The three feature types</h3>

    <dl class="about-classes">
      <dt>
        <span class="about-swatch" :style="{ background: colors.Glacier }"></span>
        Glacier <span class="about-count">1,331 features · 366.5 km²</span>
      </dt>
      <dd>
        Perennial snow and ice that moves. Movement was inferred from visible
        evidence, above all crevasses.
      </dd>

      <dt>
        <span class="about-swatch" :style="{ background: colors['Perennial snowfield'] }"></span>
        Perennial snowfield
        <span class="about-count">1,176 features · 31.0 km²</span>
      </dt>
      <dd>
        Snow and ice that persists year to year but shows no sign of movement.
        These are included because they too store water and feed streams
        through the summer.
      </dd>

      <dt>
        <span class="about-swatch" :style="{ background: colors['Buried ice'] }"></span>
        Buried ice <span class="about-count">35 features · 3.6 km²</span>
      </dt>
      <dd>
        Debris-covered, stagnant ice that was once part of a glacier. Slope was
        used to tell these apart from rock glaciers: ice continuing at the same
        slope as a rock glacier was treated as part of it, while ice separated
        by a topographic depression was mapped on its own.
      </dd>
    </dl>

    <h3>How the features were mapped</h3>

    <p>
      Every outline was digitized by hand in a GIS at scales between 1:300 and
      1:2000. Two of the authors reviewed all outlines independently, and
      disagreements were revised until resolved.
    </p>

    <p>
      Imagery came mostly from the National Agriculture Imagery Program (NAIP),
      at 0.6 m resolution or finer, supplemented by Maxar satellite imagery
      (0.5–1 m) and Google Earth imagery (about 1 m) where aerial coverage fell
      short. Images were acquired between 2013 and 2020, more than 73 % of the
      outlines coming from 2015. Late-summer imagery was preferred, because
      that is when seasonal snow is least likely to hide the true edge of the
      ice.
    </p>

    <h3>How certain are the outlines?</h3>

    <p>
      The authors put the uncertainty of the total glacier area at about 5 %.
      Perennial snowfields are far less certain, roughly 30 %, because
      lingering seasonal snow is hard to distinguish from snow that survives
      the summer. Each feature records the year and the imagery it was mapped
      from, so you can check what a given outline is based on.
    </p>

    <h3>What this viewer changes</h3>

    <p>
      The published outlines are reprojected to WGS84 longitude/latitude for
      the web map, and simplified so that no point moves more than about 1 m,
      which keeps the download to a third of its original size. Popups show a
      subset of the published attributes. For analysis, use the published
      dataset rather than this viewer.
    </p>

    <h3>Citation</h3>

    <p class="about-citation">
      Fountain, A. G., Glenn, B., and McNeil, C.: Inventory of glaciers and
      perennial snowfields of the conterminous USA,
      <cite>Earth System Science Data</cite>, 15, 4077–4104, 2023.
      <a :href="articleDoi" target="_blank" rel="noopener">{{ articleDoi }}</a>
    </p>

    <p class="about-citation">
      Dataset: Portland State University,
      <a :href="dataDoi" target="_blank" rel="noopener">{{ dataDoi }}</a>.
      The article and the dataset are both published under the
      <a :href="licenseUrl" target="_blank" rel="noopener">Creative Commons Attribution 4.0</a>
      license.
    </p>
  </section>
</template>

<script>
import { CLASS_COLORS } from '../classes';

export default {
  name: 'About',

  data() {
    return {
      colors: CLASS_COLORS,
      articleUrl: 'https://essd.copernicus.org/articles/15/4077/2023/',
      articleDoi: 'https://doi.org/10.5194/essd-15-4077-2023',
      dataDoi: 'https://doi.org/10.15760/geology-data.03',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
    };
  }
};
</script>

<style>
.about {
  max-width: 44rem;
}

.about h2 {
  margin-top: 0;
  font-size: 1.15rem;
}

.about h3 {
  margin: 1.6rem 0 0.4rem;
  font-size: 0.95rem;
}

.about p {
  margin: 0.6rem 0;
}

.about-lede {
  font-size: 1.05rem;
}

.about a {
  color: inherit;
}

.about-classes {
  margin: 0.6rem 0;
}

.about-classes dt {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.9rem;
  font-weight: 600;
}

.about-classes dd {
  margin: 0.2rem 0 0 1.1rem;
}

.about-count {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 400;
}

.about-swatch {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 2px;
}

.about-citation {
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
