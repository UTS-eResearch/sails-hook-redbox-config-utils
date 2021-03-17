const ncp = require('ncp');
const fs = require('fs-extra');
var glob = require('glob');

const hookConfig = {
  base: function (name, config) {
    if (!config) {
      console.error('Please include config');
      process.exit(-1);
    } else {
      return {
        name: name,
        angularDest: config.angularDest,
        angularOrigin: `./node_modules/${name}/${config.angularOrigin}`,
        angularTmpDest: config.angularTmpDest
      }
    }
  },
  angular: function ({hookName, angularDest, angularOrigin, angularTmpDest}) {
    return new Promise(function (resolve, reject) {
      // This can be for example: copy files or images to the redbox-portal front end
      // The Hook is environment specific, that is, the environments are also available whenever the sails app is hooked
      ncp.limit = 16;
      if (!fs.existsSync(angularOrigin)) { //Using this so sails bootstrap does not break
        console.log(`===========================`);
        console.log(`Angular dist dir (${angularOrigin}) not found`);
        console.log(`===========================`);
        resolve();
      }
      if (!fs.existsSync(angularOrigin)) { //Using this so sails bootstrap does not break
        console.log(`===========================`);
        console.log(`Angular dist dir (${angularOrigin}) not found`);
        console.log(`===========================`);
        resolve();
      }
      if (fs.existsSync(angularDest)) {
        fs.removeSync(angularDest);
      }
      if (fs.existsSync(angularTmpDest)) {
        fs.removeSync(angularTmpDest);
      }
      console.log(angularTmpDest);
      ncp(angularOrigin, angularTmpDest, function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(`${hookName}::Copied angular app to ${angularTmpDest}`);
        }
        ncp(angularOrigin, angularDest, function (err) {
          if (err) {
            reject(err);
          } else {
            console.log(`${hookName}::Copied angular app to ${angularDest}`);
          }
          resolve();
        });
      });
    });
  },
  replace: function (appPath, hookName, resPath) {
    const hookRootDir = `${appPath}/node_modules/${hookName}`;
    ///opt/hooks/sails-hook-redbox-uts/form-config/.DS_Store
    const destination = `${hookRootDir}/${resPath}`;
    const exclude = glob.sync(`${destination}/.DS_Store`);
    if (fs.pathExistsSync(destination)) {
      console.log(`${hookName}::Replace ${resPath}...`);
      fs.copySync(`${destination}/`, `${resPath}/`,{
        filter: function (name) {
          // Check if any of the items in exclude match:
          return exclude.some(function (item) {
            return item !== name
          });
        }
      });
    }
  }
}

module.exports = hookConfig;
