'use strict';
var log         = require('fancy-log');
var through     = require('through2');
var fileSystem  = require("fs");
var archiver    = require('archiver');
var mkdirp      = require('mkdirp');
var builder     = require('xmlbuilder');
var PluginError = require('plugin-error');
var _           = require("lodash");
var colors      = require("colors");

function generateManifestXml(options){
    var system_info_xml = builder.create(
      {'msdeploy.iisApp': {
        'iisApp' : {
          '@path' : options.source
        }

        }
      }).end({ pretty: true});

    return system_info_xml;
}

function generateParametersXml(options){
    var archive_xml = builder.create({"parameters" : options.parameters

    }).end({ pretty: true});
     return archive_xml;
}

function createPackage(options, callback) {
      log("Starting...".green);

        if( !_.endsWith(options.source, '/') ){
          options.source = options.source + "/";
        }

        if(!_.endsWith(options.dest, '/') ){
          options.dest = options.dest + "/";
        }

      if(options.enabled){
        mkdirp(options.dest, function(err) {
            log("WARNING: Failed to create folder '".yellow + options.dest.red.bold + "' or the directory already exists.".yellow);
        });

        log('Creating web deploy package "' + options.dest.magenta + options.package.magenta.bold + '" from the directory "' + options.source.magenta + '"');

        var output = fileSystem.createWriteStream(options.dest + options.package);
        var archive = archiver('zip');
        log("Archiving...".yellow);

        output.on('close', function () {
          log(archive.pointer() + ' total bytes');
          log("Package '" + options.dest.magenta + options.package.magenta.bold + ", created");
          callback();
        });

        archive.on('error', function(err){
            log(err.toString().red);
            callback();
        });

        archive.pipe(output);
        archive.directory(options.source);
        archive.append(generateParametersXml(options), { name:'parameters.xml' });
        archive.append( generateManifestXml(options), { name:'manifest.xml' });
        archive.finalize();
      }
  }

module.exports = function (options) {

    
	if (!options.verb) {
		options.verb = "sync";
	}
    
    if (!options.dest) {
		options.dest = "webdeploy/";
	}
    
    if (!options.source) {
		options.source = "dist/";
	}
    
    if (!options.package) {
		options.package = "webdeploy.zip";
	}
    
    if (!options.enabled) {
		options.enabled = true;
	}
    
    if (!options.includeAcls) {
		options.includeAcls = true;
	}

  if (!options.parameters) {
    options.parameters = { };
  }

	return through.obj(function (file, enc, callback) {
        log('Initializing...');

        if (file.isStream()) {
            throw PluginError("gulp-mswebdeploy-package", "Stream is not supported");
            return callback();
        }
      
        createPackage(options, callback);
	});
};
