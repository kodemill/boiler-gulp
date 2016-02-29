import gulp, {task, src, dest, parallel, series, watch} from 'gulp';
import plumber from 'gulp-plumber';
import browserify from 'browserify';
import collapse from 'bundle-collapser/plugin'
import watchify from 'watchify';
import babelify from 'babelify';
import uglify from 'gulp-uglify';
import cssnano from 'gulp-cssnano';
import sass from 'gulp-sass';
import changed from 'gulp-changed';
import sourcemaps from 'gulp-sourcemaps';
import browserSyncFactory from 'browser-sync';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import del from 'del';
import mkdirp from 'mkdirp';

const browserSync = browserSyncFactory.create();

const dirs = {
  src: './src',
  dist: './dist',
//  tmp: './tmp'
};

const sources = {
  html: `${dirs.src}/html/**/*.html`,
  scss: `${dirs.src}/scss/**/*.scss`,
  js: `${dirs.src}/js/**/*.js`,
  //ejs: [`${dirs.src}/ejs/**/*.ejs`,
  jsEntry: `${dirs.src}/js/index.js`,
};

function errorHandler (err) {
  console.log(err.message || err);
  browserSync.notify('build error: check console');
  this.emit('end');
}

function copyHtml () {
  return src(sources.html)
    .pipe(plumber({ errorHandler }))
    .pipe(changed('html'))
    .pipe(dest(dirs.dist))
    .pipe(browserSync.stream());
}

function prodJs () {
  return browserify(sources.jsEntry)
    .transform(babelify, {'presets': ['es2015']})
    .plugin(collapse)
    .bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(dest(dirs.dist));
}

function watchJs () {
  const b = watchify(browserify({
      entries: sources.jsEntry,
      debug: true
    })).transform(babelify, {'presets': ['es2015']});
  const rebundle = function () {
    return b.bundle()
      .pipe(plumber({ errorHandler }))
      .pipe(source('app.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))

      .pipe(sourcemaps.write())
      .pipe(dest(dirs.dist))
      .pipe(browserSync.stream({ once: true }));
  };
  b.on('update', rebundle);
  b.on('time', (t) => {
    console.log(`watchJs:rebundle finished after ${t} ms`);
  });
  return rebundle(b);
}

function prodScss () {
  return src(sources.scss)
    .pipe(sass().on('error', sass.logError))
    .pipe(cssnano())
    .pipe(dest(dirs.dist));
}

function devScss () {
  return src(sources.scss)
    .pipe(plumber({ errorHandler }))
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(dest(dirs.dist))
    .pipe(browserSync.stream());
}

function serve (done) {
  browserSync.init({
    server: {
      baseDir: dirs.dist,
      routes: {
          '/': 'index.html'
      }
    }
  }, done);
}

function clean () {
  return del(dirs.dist);
}

function mkdirDist (cb) {
  mkdirp(dirs.dist, cb);
}

task(watchJs);
task('watchScss', () => {
  watch(sources.scss, devScss);
  return devScss();
});
task('watchHtml', () => {
  watch(sources.html, copyHtml);
  return copyHtml();
});
task('prod', series(clean, mkdirDist, parallel(prodJs, copyHtml, prodScss)));
task('dev', series(clean, mkdirDist, parallel(serve, 'watchJs', 'watchScss', 'watchHtml')));
