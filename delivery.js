import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';

const DATA_ROOT = process.env.FILE_PATH || '/data/files/';
const SHARE_PREFIX = process.env.SHARE_PREFIX || 'share:\/\/';
const ALGORITHMS = process.env.DISABLE_SSH_DSS ? {} : { serverHostKey: ['ssh-dss'] };

/**
 * The boilerplate to deliver the package linked to report
 * returns exception on fail
 * @method deliver
 */
const deliver = async function ( report ) {
  let sourcePath = fileUrlToPath(report.package);
  let targetPath = generateTargetPath(report);
  let connection = createConnection();
  try {
    await uploadPackage(connection, sourcePath, targetPath);
  }
  catch(e){
    console.error(e);
    throw e;
  }
};

const createConnection = function(){
  let connection = {
    host: process.env.TARGET_HOST || 'sftp',
    username: process.env.TARGET_USERNAME,
    port: process.env.TARGET_PORT || 22,
    algorithms: ALGORITHMS
  };

  if(process.env.TARGET_KEY)
    connection.privateKey = fs.readFileSync(process.env.TARGET_KEY);

  if(process.env.TARGET_PASSWORD)
    connection.password = process.env.TARGET_PASSWORD;

  return connection;
};

const uploadPackage = async function( connection, filePath, targetPath ){
  let sftp = new Client();
  try {
    await sftp.connect(connection);
    if (process.env.ENABLE_CREATE_TARGET_DIR)
      await sftp.mkdir(path.dirname(targetPath), true);
    await sftp.put(filePath, targetPath);
  }
  finally{
    await sftp.end();
  }
};

const generateTargetPath = function( report ){
  let fileName = path.basename(report.package);
  return path.join(process.env.TARGET_DIR, fileName);
};

/**
 * convert a file url (share://the/path/to/the/file) to the local path
 * courtesy: Niels Vandekeybus
 * e.g `filePath/the/path/to/the/file`
 * @method fileUrlToPath
 * @return {String}
 */
const fileUrlToPath = function(fileUrl) {
return fileUrl.replace(SHARE_PREFIX, DATA_ROOT);
};

export { deliver };
