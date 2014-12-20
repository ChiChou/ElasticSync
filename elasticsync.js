'use strict';

var os = require('os');
var elasticsearch = require('elasticsearch');
var argv = require('minimist')(process.argv.slice(2));
var async = require('async');

/**
 * get options from command line
 * 
 * @param {String} src data source
 * @param {String} dest data destination
 * @param {String} limit records for each index
 * @param {String} dropExistance drop index if exists
 * @param {String} query query for filtering data source
 */
var src = argv.src || argv.s || 'localhost:9200',
  dest = argv.dest || argv.d || 'dockerhost:9200',
  limit = argv.limit || argv.l || 10,
  dropExistance = argv.override,
  query = argv.query || argv.q;

// parse JSON
try {
  query = JSON.parse(query);
} catch(e) {
  query = {
    match_all: {},
  };
}

// create connections
var clientSource = new elasticsearch.Client({host: src}),
  clientDestination = new elasticsearch.Client({host: dest});

clientSource.indices.getMapping({requestTimeout: 15000}, function(err, indices) {
  if (err) {
    console.log('Failed to list indices:', err.message);
    process.exit(-1);
  }

  var indexes = Object.keys(indices);
  console.log(indexes.length + " indexes found:");
  console.log('    ' + indexes.join(os.EOL + '    '));
  console.log('');

  async.eachLimit(indexes, 3, function(indexName, nextIndex) {
    console.log('Processing index:', indexName);

    var param = {index: indexName};
    async.waterfall([function(next) {
      // drop existing indexes
      if (!dropExistance) {
        next();
        return;
      }

      clientDestination.indices.exists(param, function(err, existance) {
        if (err) next(err);

        if (existance) {
          console.log(dest + '/' + indexName + ' exists. Dropping...');
          clientDestination.indices.delete(param, function(err) {
            next(err);
          });
        } else {
          next();
        }
      });

    }, function(next) {
      // recreate index

      clientSource.indices.getSettings(param, function(err, settings) {
        clientDestination.indices.create({
          index: indexName, 
          body: settings[indexName]
        }, function(err) {
          next(err);
        });
      });

    }, function(next) {
      // create mapping
      
      var mappings = indices[indexName].mappings;
      var types = Object.keys(mappings);
      
      async.eachSeries(types, function(type, nextType) {
        var body = mappings[type];
        clientDestination.indices.putMapping({
          index: indexName, type: type, body: body
        }, nextType);
      }, function(err) {
        console.log(src + '/' + indexName + ' mapping finished.');
        next(err, types);
      });

    }, function(types, next) {
      // transport
      
      async.eachLimit(types, 3, function(type, nextSearch) {
        clientSource.search({
          index: indexName,
          type: type,
          body: {
            from: 0,
            size: limit,
            query: query
          }
        }, function (err, res) {
          if (err) {
            // raise error
            nextSearch(err);
          } else {
            var _wrap = function(doc) {
              return {index: {_index: indexName, _type: type, _id: doc._id}};
            };

            var hits = res.hits.hits;

            if (!hits.length) {
              nextSearch();
              return;
            }

            // bulk save to destination
            clientDestination.bulk({
              body: hits.reduce(function(prev, current) {
                if (Array.isArray(prev)) {
                  return prev.concat([_wrap(current), current._source]);
                } else {
                  return [
                    _wrap(prev), prev._source,
                    _wrap(current), current._source
                  ];
                }
              })
            }, function (err, res) {
              if (!err) {
                console.log('Transported ' + res.items.length + ' items from '
                  + src + '/' + indexName + '/' + type);
              }
              setTimeout(function() {
                nextSearch(err);
              }, 40);
            });
          }
        });

      }, function(err) {
        next(err);
      });
      
    }, function(next) {
      clientDestination.indices.refresh({}, next);
    }], function(err, next) {
      if (err) {
        console.log('Got an error:');
        console.log(err);
      }
      // transport data
      nextIndex(err);
    });
  }, function(err) {
    var info = 'Task sussessfully finished. Bye.',
      status = 0;
    if(err) {
      info = 'Got an error during dump.';
      status = -1;
    }
    console.log(info);
    console.log(err || '\n');
    process.exit(status);
  });

});