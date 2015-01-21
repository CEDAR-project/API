// Load some Node libraries
var sys = require("sys"), 
    request = require("request"), 
    querystring = require("querystring"), 
    fs = require("fs"),
    url = require("url"),
    async = require("async"), 
    underscore = require("underscore"),
    events = require("events"),
    express = require('express'),
    compress = require('compression'),
    serveStatic = require('serve-static'),
    N3 = require('n3');

// Load the templates for the SPARQL queries
var sparql_describe = fs.readFileSync(__dirname+'/describe.sparql').toString();

/*
 * Utility function to run a GET query against the SPARQL end point
 */
function executeSPARQLQuery(queryTxt, callbackSPARQL) {
    // Serialise the request
    var uri =  'http://lod.cedar-project.nl/cedar/sparql?' + querystring.stringify({query: queryTxt});

    // Send it
    request(uri, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            callbackSPARQL(body);
        }
    });
}


function DescribeObservation(observation_uri) {
    // The store that will be used to store the description
    var store = N3.Store();

    // Emitter used to fire back the result when we are done
    var emitter = new events.EventEmitter();

    // Function to listen to the results
    this.onResults = function(callback) {
        emitter.addListener("chains", function () {
            clearTimeout(timeout);
            callback(store);
        });
        var timeout = setTimeout(function() {
            emitter.removeAllListeners();
            callback(store);
        }, 30000);        
    };

    // Function to trigger fetching the data
    this.getDescription = function() {
        console.log('Got a request for', observation_uri); 

        // Fetch descriptions starting with the target node
        fetch_description([observation_uri]);
    };

    function fetch_description(target_uri_queue) {
        // If the queue is empty we have nothing else left to fetch
        if (target_uri_queue.length == 0) {
            console.log('finished!');
            emitter.emit("chains", store);
            return;
        }

        // Fetch the next uri
        target_uri = target_uri_queue.shift();

        // Instantiate the query
        var queryTxt = sparql_describe.replace('__resource__', target_uri).replace('__resource__', target_uri);

        // Launch it
        executeSPARQLQuery(queryTxt, function (body) {
            var parser = N3.Parser();
            parser.parse(body, function (error, triple, prefixes) {
                if (triple) {
                    store.addTriple(triple.subject, triple.predicate, triple.object);
                    // Follow on every prov related resource
                    if ((/^http:\/\/www\.w3\.org\/ns\/prov#/).test(triple.predicate)) {
                        var next_resource = triple.object;
                        // But only query for the resources we describe
                        if ((/^http:\/\/lod\.cedar-project\.nl/).test(next_resource)) {
                            target_uri_queue.push(next_resource);
                        }
                    }
                } else {
                    // End of the file, re-process the queue if necessary
                    fetch_description(target_uri_queue);
                }
            });
        });

    }
};


/*
 * Create and start the server
 */
var app = express();

app.use(compress());

app.use(serveStatic(__dirname + '/public', {'index': ['index.html']}));

app.get('/get', function(request, response) {
    var id = request.query.id;
    
    var description = new DescribeObservation(id);
    
    description.onResults(function(data) {
        response.writeHead(200, { "Content-Type" : "text/plain" });
        var writer = N3.Writer({ prefixes: { 'cedar': 'http://lod.cedar-project.nl:8888/cedar/resource/' } });
        underscore.each(data.find(null, null, null), function (triple,index,c) { writer.addTriple(triple); });
        writer.end(function (error, result) { response.write(result, 'utf8'); });
        response.end();
    });

    description.getDescription();
});

app.listen(8880);

sys.puts("Server running at http://localhost:8880/");

// http://lod.cedar-project.nl:8888/cedar/resource/VT_1849_03_H2-S0-C10-h
// http://lod.cedar-project.nl:8888/cedar/resource/BRT_1930_07_S3-S0-S651-h
// http://lod.cedar-project.nl:8888/cedar/resource/BRT_1930_07_S3_S0_S651-harmonized
// http://www.jsplumb.org/demo/flowchart/dom.html
