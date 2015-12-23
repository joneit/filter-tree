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
gulp.task('browserify', browserify);
gulp.task('serve', browserSyncLaunchServer);

gulp.task('build', function(callback) {
    clearBashScreen();
    runSequence(
        'lint',
        'test',
        'doc',
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
        '!' + srcDir + 'index.js',
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

function browserify(callback) {
    var source = gulp.src(srcDir + 'css/' + name + '.css'),
        destination = gulp.dest(srcDir);

    var cssInjectedIntoSource = gulp.src(srcDir + 'js/' + global + '.js')
        .pipe($$.inject(source, {
            transform: cssToJsFn,
            starttag: '/* {{name}}:{{ext}} */',
            endtag: '/* endinject */'
        }))
        .pipe($$.mirror(
            pipe(
                $$.rename('index.js'),
                $$.replace(
                    'require(\'./',
                    'require(\'./js/'
                ),
                $$.replace(
                    'require(\'../',
                    'require(\'./'
                ),
                gulp.dest(srcDir)
            ),
            pipe(
                $$.replace(
                    'module.exports =',
                    'window.' + global + ' ='
                ),
                $$.mirror(
                    pipe(
                        $$.rename(name + '.js'),
                        $$.browserify({ debug: true })
                    ),
                    pipe(
                        $$.rename(name + '.min.js'),
                        $$.browserify(),
                        $$.uglify()
                    )
                ),
                gulp.dest(buildDir)
            )
        ));

    //cssInjectedIntoSource
    //    .pipe($$.rename('index.js'))
    //    .pipe(gulp.dest(srcDir));


    callback();
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
