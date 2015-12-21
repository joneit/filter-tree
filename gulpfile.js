'use strict';

var gulp        = require('gulp'),
    $$          = require('gulp-load-plugins')(),
    runSequence = require('run-sequence'),
    browserSync = require('browser-sync').create(),
    exec        = require('child_process').exec,
    path        = require('path');

var name     = 'filter-tree',
    global   = 'FilterTree',
    srcDir   = './src/',
    testDir  = './test/',
    buildDir = './build/';

//  //  //  //  //  //  //  //  //  //  //  //

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);
gulp.task('browserify', function(callback) {
    browserify();
    browserifyMin();
    callback();
});

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
    gulp.watch([srcDir + '**', testDir + '**', buildDir + 'demo.html'], ['build']);
    gulp.watch([buildDir + name + '.js'], ['reload']);
});

gulp.task('default', ['build', 'watch'], browserSyncLaunchServer);

//  //  //  //  //  //  //  //  //  //  //  //

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

function browserify() {
    return gulp.src(srcDir + 'index.js')
        .pipe($$.replace(
            'module.exports =',
            'window.' + global + ' ='
        ))
        .pipe($$.browserify({ debug: true }))
        .on('error', $$.util.log)
        .pipe($$.rename(name + '.js'))
        .pipe(gulp.dest(buildDir));
}

function browserifyMin() {
    return gulp.src(srcDir + 'index.js')
        .pipe($$.replace(
            'module.exports =',
            'window.' + global + ' ='
        ))
        .pipe($$.browserify())
        .pipe($$.uglify())
        .on('error', $$.util.log)
        .pipe($$.rename(name + '.min.js'))
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
