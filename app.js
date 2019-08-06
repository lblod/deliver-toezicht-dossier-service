import { app, errorHandler } from 'mu';
import { fetchDossiersByStatus, updateDossierStatus,
         STATUS_PACKAGED, STATUS_DELIVERING, STATUS_FAILED, STATUS_DELIVERED} from './queries';
import { deliver } from './delivery';
import { waitForDatabase } from './database';
import { CronJob } from 'cron';

const cronFrequency = process.env.PACKAGE_CRON_PATTERN || '*/30 * * * * *';
const hoursDeliveringTimeout = process.env.HOURS_DELIVERING_TIMEOUT || 3;

waitForDatabase(createCronJob);

function createCronJob() {
  return new CronJob(cronFrequency, async function() {
    console.log(`Toezicht delivery triggered by cron job at ${new Date().toISOString()}`);
    deliverPackages();
  }, null, true);
}

const deliverPackages = async function() {
  try {
    let dossiersToDeliver = await fetchDossiersByStatus(STATUS_PACKAGED);
    dossiersToDeliver = dossiersToDeliver.concat((await fetchDossiersByStatus(STATUS_DELIVERING)).filter(filterDeliveringTimeout));
    dossiersToDeliver = dossiersToDeliver.concat(await fetchDossiersByStatus(STATUS_FAILED));

    console.log(`Found ${dossiersToDeliver.length} Toezicht dossiers to deliver`);
    dossiersToDeliver.forEach(async function(dossier) {
      try {
        console.log(`Start delivering Toezicht dossier ${dossier.id} found in graph <${dossier.graph}>`);
        await updateDossierStatus(dossier.uri, STATUS_DELIVERING, dossier.graph);
        await deliver(dossier);
        await updateDossierStatus(dossier.uri, STATUS_DELIVERED, dossier.graph);
        console.log(`Delivered Toezicht dossier ${dossier.id} successfully`);
      }
      catch(e){
        console.log(`Failed to deliver Toezicht dossier ${dossier.id}`);
        console.error(e);
        await updateDossierStatus(dossier.uri, STATUS_FAILED, dossier.graph);
      }
    });
  }
  catch(e){
    console.error(e);
  }
};

const filterDeliveringTimeout = function( dossier ) {
  let modifiedDate = new Date(dossier.modified);
  let currentDate = new Date();
  return ((currentDate - modifiedDate) / (1000 * 60 * 60)) >= parseInt(hoursDeliveringTimeout);
};

app.use(errorHandler);
