import { sparqlEscapeDateTime, sparqlEscapeUri } from 'mu';
import { querySudo as query, updateSudo as update } from './auth-sudo';

const STATUS_PACKAGED = "http://mu.semte.ch/vocabularies/ext/toezicht-status/PACKAGED";
const STATUS_DELIVERING = "http://mu.semte.ch/vocabularies/ext/toezicht-status/DELIVERING";
const STATUS_DELIVERED = "http://mu.semte.ch/vocabularies/ext/toezicht-status/DELIVERED";
const STATUS_FAILED = "http://mu.semte.ch/vocabularies/ext/toezicht-status/DELIVERY_FAILED";


/**
 * fetch dossiers by status
 * @method fetchDossierDataByStatus
 * @return {Array}
 */
const fetchDossiersByStatus = async function( status ) {
  const result = await query(`
       PREFIX mu:   <http://mu.semte.ch/vocabularies/core/>
       PREFIX dcterms: <http://purl.org/dc/terms/>
       PREFIX toezicht: <http://mu.semte.ch/vocabularies/ext/supervision/>

       SELECT ?id ?uri ?package ?modified ?graph
       WHERE {
         GRAPH ?graph {
             ?uri toezicht:package ?package;
                  toezicht:status ${sparqlEscapeUri(status)};
                  mu:uuid ?id;
                  dcterms:modified ?modified.
         }
       } ORDER BY ASC(?modified)
 `);
  return parseResult(result);
};

const updateDossierStatus = async function( dossier, status, graph ){
  await update(`
       PREFIX toezicht: <http://mu.semte.ch/vocabularies/ext/supervision/>
       PREFIX dcterms: <http://purl.org/dc/terms/>

       DELETE {
         GRAPH <${graph}> {
             ${sparqlEscapeUri(dossier)} dcterms:modified ?modified.
             ${sparqlEscapeUri(dossier)} toezicht:status ?status.
         }
       }
       WHERE {
         {
           ${sparqlEscapeUri(dossier)} dcterms:modified ?modified.
         }
         UNION
         {
           OPTIONAL{ ${sparqlEscapeUri(dossier)} toezicht:status ?status }
         }
       }

       ;

       INSERT DATA {
         GRAPH <${graph}> {
             ${sparqlEscapeUri(dossier)} dcterms:modified ${sparqlEscapeDateTime(new Date())};
                                        toezicht:status ${sparqlEscapeUri(status)}.
         }
       }
  `);
};

/**
 * convert results of select query to an array of objects.
 * courtesy: Niels Vandekeybus
 * @method parseResult
 * @return {Array}
 */
const parseResult = function( result ) {
  const bindingKeys = result.head.vars;
  return result.results.bindings.map((row) => {
    const obj = {};
    bindingKeys.forEach((key) => obj[key] = row[key] && row[key].value);
    return obj;
  });
};

export {
  fetchDossiersByStatus,
  updateDossierStatus,
  STATUS_PACKAGED,
  STATUS_DELIVERING,
  STATUS_FAILED,
  STATUS_DELIVERED
}
