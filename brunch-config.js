'use strict';

// Load local settings (e.g. MAPBOX_ACCESS_TOKEN) from the gitignored .env
// before the babel plugin below inlines them. Variables already set in the
// environment win over the file.
const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

module.exports = {
  files: {
    javascripts: {
      joinTo: {
        // Everything under node_modules (vue, vue-router, ...)
        'js/vendor.js': /^(?!app\/)/,
        // Our own source, including compiled .vue single-file components
        'js/app.js': /^app\//
      }
    },
    stylesheets: {
      joinTo: 'css/app.css'
    }
  },

  // `require('initialize')` is injected at the end of js/app.js so the app
  // boots without an inline <script> in index.html.
  modules: {
    autoRequire: {
      'js/app.js': ['initialize']
    }
  },

  npm: {
    // Concatenated into vendor.js as-is. mapbox-gl's prebuilt bundle uses
    // syntax brunch's dependency parser can't read, and it defines the
    // `mapboxgl` global itself.
    static: ['node_modules/mapbox-gl/dist/mapbox-gl.js'],
    // Pulled into css/app.css alongside our own styles.
    styles: {
      'mapbox-gl': ['dist/mapbox-gl.css']
    }
  },

  plugins: {
    babel: {
      presets: ['@babel/preset-env'],
      // Bakes MAPBOX_ACCESS_TOKEN from the build environment into app/config.js.
      plugins: [
        ['transform-inline-environment-variables', { include: ['MAPBOX_ACCESS_TOKEN'] }]
      ],
      // Files in npm.static still pass through compilers; without this,
      // Babel re-transpiles mapbox-gl.js and adds ~250 KB to vendor.js.
      ignore: [/^(node_modules)/]
    },
    vue: {
      // vueify options; extractCSS pulls <style> blocks out of SFCs into the
      // stylesheet bundle instead of injecting them at runtime.
      extractCSS: true,
      out: 'public/css/components.css',
      // vueify runs SFC scripts through Babel 6, not babel-brunch. Only
      // convert ES modules to CommonJS so brunch's module wrapper accepts
      // them; everything else ships as written.
      babel: {
        babelrc: false,
        plugins: ['transform-es2015-modules-commonjs']
      }
    }
  }
};
