import {src, dest} from 'gulp';
import cache from 'gulp-cached';

export default function copy (srcGlob, destGlob) {
  return src(srcGlob)
    .pipe(cache(`copy_${srcGlob}`)) //make sure distinct globs get distinct caches
    .pipe(dest(destGlob));
}
