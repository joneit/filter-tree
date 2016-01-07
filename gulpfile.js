'use strict';

var gulp        = require('gulp'),
    $$          = require('gulp-load-plugins')(),
    runSequence = require('run-sequence'),
    browserSync = require('browser-sync').create(),
    exec        = require('child_process').exec,
    path        = require('path'),
    escapeStr   = require('js-string-escape'),
    CleanCss    = require("clean-css"),
    pipe        = require('multipipe');

var name     = 'filter-tree',
    global   = 'FilterTree',
    srcDir   = './src/',
    testDir  = './test/',
    buildDir = './build/';

//  //  //  //  //  //  //  //  //  //  //  //

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);
gulp.task('injection', injectCSS);
gulp.task('browserify', browserify);
gulp.task('serve', browserSyncLaunchServer);

gulp.task('build', function(callback) {
    clearBashScreen();
    runSequence(
        'lint',
        //'test',
        //'doc',
        'injection',
        'browserify',
        callback
    );
});

gulp.task('reload', function() {
    browserSync.reload();
});

gulp.task('watch', function () {
    gulp.watch([
        srcDir + '**',
        '!' + srcDir + 'js/css.js',
        testDir + '**',
        buildDir + 'demo.html'
    ], [
        'build'
    ]);
    gulp.watch([
        buildDir + name + '.js'
    ], [
        'reload'
    ]);
});

gulp.task('default', ['build', 'watch'], browserSyncLaunchServer);

//  //  //  //  //  //  //  //  //  //  //  //

function cssToJsFn(filePath, file) {
    var STYLE_HEADER = 'css = \'',
        STYLE_FOOTER = '\';';

    var css = new CleanCss({})
        .minify(file.contents.toString())
        .styles;

    file.contents = new Buffer(STYLE_HEADER + escapeStr(css) + STYLE_FOOTER);

    return file.contents.toString('utf8');
}

function lint() {
    return gulp.src(srcDir + '**/*.js')
        .pipe($$.excludeGitignore())
        .pipe($$.eslint())
        .pipe($$.eslint.format())
        .pipe($$.eslint.failAfterError());
}

function test() {
    return gulp.src(testDir + 'index.js')
        .pipe($$.mocha({reporter: 'spec'}));
}

function browserSyncLaunchServer() {
    browserSync.init({
        server: {
            // Serve up our build folder
            baseDir: buildDir,
            index: 'demo.html'
        },
        port: 9013
    });
}

function injectCSS() {
    // inject the css from css/filter-tree.css via css/filter-tree.js into new file js/css.js
    return gulp.src(srcDir + 'css/' + name + '.js')
        .pipe($$.inject(gulp.src(srcDir + 'css/' + name + '.css'), {
            transform: cssToJsFn,
            starttag: '/* {{name}}:{{ext}} */',
            endtag: '/* endinject */'
        }))
        .pipe($$.rename('css.js'))
        .pipe(gulp.dest(srcDir + 'js/'));
}

function browserify() {
    // browserify the root file src/index.js into build/filter-tree.js and filter-tree.min.js
    return gulp.src(srcDir + 'index.js')
        .pipe($$.replace(
            'module.exports =',
            'window.' + global + ' ='
        ))
        .pipe($$.mirror(
            pipe(
                $$.rename(name + '.js'),
                $$.browserify({ debug: true })
                    .on('error', $$.util.log)
            ),
            pipe(
                $$.rename(name + '.min.js'),
                $$.browserify(),
                $$.uglify()
                    .on('error', $$.util.log)
            )
        ))
        .pipe(gulp.dest(buildDir));
}

function doc(callback) {
    exec(path.resolve('jsdoc.sh'), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        callback(err);
    });
}

function clearBashScreen() {
    var ESC = '\x1B';
    console.log(ESC + 'c'); // (VT-100 escape sequence)
}
