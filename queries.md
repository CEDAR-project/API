Visualisation: http://bl.ocks.org/kerryrodden/7090426

http://lod.cedar-project.nl:8080/sparql/udc

# Get a concept
prefix skos: <http://www.w3.org/2004/02/skos/core#> 
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> 
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
prefix owl: <http://www.w3.org/2002/07/owl#> 
prefix dct: <http://purl.org/dc/terms/> 
prefix foaf: <http://xmlns.com/foaf/0.1/> 

SELECT ?concept ?label FROM <http://udc.example.org/> WHERE {
  ?concept a skos:Concept;
  skos:prefLabel ?label
  FILTER(REGEX(STR(?label), "linguistique"))
}

# Get the parent of a concept
?concept skos:broader ?c


