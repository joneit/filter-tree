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
    main     = 'FilterTree',
    testDir  = './test/',
    buildDir = './build/';

//  //  //  //  //  //  //  //  //  //  //  //

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);
gulp.task('injection', injectCSS);
gulp.task('browserify', browserify);
gulp.task('serve', browserSyncLaunchServer);

gulp.task('html-templates', function() {
    templates('html');
});

gulp.task('build', function(callback) {
    clearBashScreen();
    runSequence(
        'lint',
        'html-templates',
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
        './css/*.css',
        './html/*.html',
        './js/**',
        '!./js/stylesheet.js', // generated file
        testDir + '**',
        buildDir + '*'
    ], [
        'build'
    ]);

    gulp.watch([
        buildDir + 'lib/' + name + '.js'
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
    return gulp.src(['./js/**/*.js', buildDir + '*.js'])
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
    // inject the css from css/filter-tree.css via css/css.js into new file js/stylesheet.js
    return gulp.src('./css/css.js')
        .pipe($$.inject(gulp.src('./css/' + name + '.css'), {
            transform: cssToJsFn,
            starttag: '/* {{name}}:{{ext}} */',
            endtag: '/* endinject */'
        }))
        .pipe($$.rename('stylesheet.js'))
        .pipe(gulp.dest('./js/'));
}

function browserify() {
    // browserify the root file src/index.js into build/filter-tree.js and filter-tree.min.js
    return gulp.src('./index.js')
        .pipe($$.replace(
            'module.exports =',
            'window.' + main + ' ='
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
        .pipe(gulp.dest(buildDir + 'lib/'));
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

function templates(folder) {
    return gulp.src('./' + folder + '/*.' + folder)
        .pipe($$.each(function(content, file, callback) {
            var filename = path.basename(file.path, ".html"),
                member = /[^\w]/.test(filename) ? "['" + filename + "']" : "." + filename;

            // convert (groups of) 4 space chars at start of lines to tab(s)
            do {
                var len = content.length;
                content = content.replace(/\n(    )*    (.*)/, "\n$1\t$2");
            } while (content.length < len);

            // quote each line and join them into a single string
            content = 'exports' + member + " = [\n'" + content
                    .replace(/'/g, "\\'")
                    .replace(/\n/g, "',\n'") + "'\n].join('\\n');\n";

            // remove possible blank line at end of each
            content = content.replace(/,\n''\n]/g, "\n]");

            callback(null, content); // the first argument is an error, if you encounter one
        }))
        .pipe($$.concat("index.js"))
        .pipe($$.header("'use strict';\n\n"))
        .pipe(gulp.dest(function(file) { return file.base; }));
}
