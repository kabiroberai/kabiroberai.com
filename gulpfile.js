"use strict";

// Load plugins
const browsersync = require("browser-sync").create();
const cleanCSS = require("gulp-clean-css");
const gulp = require("gulp");
const header = require("gulp-header");
const merge = require("merge-stream");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const sass = require("gulp-sass")(require("sass"));
const uglify = require("gulp-uglify");
const rsync = require("gulp-rsync");
const fs = require("fs/promises");

// Load package.json for banner
const pkg = require('./package.json');

// Set the banner content
const banner = `/*!
 * Resume v<%= pkg.version %> (<%= pkg.homepage %>)
 * Copyright 2019-${new Date().getFullYear()} <%= pkg.author %>
 * Based on https://github.com/BlackrockDigital/startbootstrap-resume
 */

`;

// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "./dist"
    },
    port: 3000
  });
  done();
}

// Clean dist
function clean() {
  return fs.rm('./dist', { recursive: true, force: true })
}

// Bring third party dependencies from node_modules into vendor directory
function vendor() {
  // Bootstrap
  var bootstrap = gulp.src('./node_modules/bootstrap/dist/**/*')
    .pipe(gulp.dest('./dist/vendor/bootstrap'));
  // Font Awesome CSS
  var fontAwesomeCSS = gulp.src('./node_modules/@fortawesome/fontawesome-free/css/**/*')
    .pipe(gulp.dest('./dist/vendor/fontawesome-free/css'));
  // Font Awesome Webfonts
  var fontAwesomeWebfonts = gulp.src('./node_modules/@fortawesome/fontawesome-free/webfonts/**/*')
    .pipe(gulp.dest('./dist/vendor/fontawesome-free/webfonts'));
  // jQuery Easing
  var jqueryEasing = gulp.src('./node_modules/jquery.easing/*.js')
    .pipe(gulp.dest('./dist/vendor/jquery-easing'));
  // jQuery
  var jquery = gulp.src([
      './node_modules/jquery/dist/*',
      '!./node_modules/jquery/dist/core.js'
    ])
    .pipe(gulp.dest('./dist/vendor/jquery'));
  return merge(bootstrap, fontAwesomeCSS, fontAwesomeWebfonts, jquery, jqueryEasing);
}

// CSS task
function css() {
  return gulp
    .src("./scss/*.scss")
    .pipe(plumber())
    .pipe(sass({
      outputStyle: "expanded",
      includePaths: ["./node_modules"],
    }))
    .on("error", sass.logError)
    .pipe(header(banner, { pkg }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(cleanCSS())
    .pipe(gulp.dest("./dist/css"))
    .pipe(browsersync.stream());
}

// JS task
function js() {
  return gulp
    .src('./js/*.js')
    .pipe(uglify())
    .pipe(header(banner, { pkg }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./dist/js'))
    .pipe(browsersync.stream());
}

// HTML task
function html() {
  return gulp
    .src([
      './**/*.html',
      '!./node_modules/**/*.html',
      '!./dist/**/*.html'
    ])
    .pipe(gulp.dest('./dist'))
    .pipe(browsersync.stream());
}

function assets() {
  return gulp
    .src('./assets/**/*')
    .pipe(gulp.dest('./dist/assets'))
    .pipe(browsersync.stream());
}

// Watch files
function watchFiles() {
  gulp.watch("./scss/**/*", css);
  gulp.watch("./js/**/*", js);
  gulp.watch([
    "./**/*.html",
    "!./node_modules/**/*.html",
    "!./dist/**/*.html"
  ], html);
  gulp.watch('./assets/**/*', assets);
}

function upload() {
  return gulp.src('./dist/**')
    .pipe(rsync({
      root: 'dist/',
      username: 'kabiroberai',
      hostname: 'kabiroberai.com',
      destination: '/var/www/kabiroberai.com/',
      archive: true,
      compress: true,
      silent: true
    }));
}

// Define complex tasks
const build = gulp.series(clean, vendor, gulp.parallel(html, css, js, assets));
const watch = gulp.series(build, gulp.parallel(watchFiles, browserSync));
const deploy = gulp.series(build, upload);

module.exports = { css, js, clean, vendor, build, watch, deploy, default: build };
