"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Services = void 0;
const services = require("./CoreService.js");
const fs = require("fs-extra");
const path_1 = require("path");
var Services;
(function (Services) {
    class Config extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'getBrand',
                'mergeHookConfig'
            ];
        }
        getBrand(brandName, configBlock) {
            let configVal = sails.config[configBlock][brandName];
            if (_.isUndefined(configVal)) {
                brandName = sails.config.auth.defaultBrand;
                configVal = sails.config[configBlock][brandName];
            }
            return configVal;
        }
        mergeHookConfig(hookName, configMap = sails.config, config_dirs = ["form-config", "config"], dontMergeFields = ["fields"]) {
            const that = this;
            var hook_root_dir = `${sails.config.appPath}/node_modules/${hookName}`;
            var appPath = sails.config.appPath;
            if (!fs.pathExistsSync(hook_root_dir) && _.endsWith(sails.config.appPath, hookName)) {
                hook_root_dir = sails.config.appPath;
                appPath = appPath.substring(0, appPath.lastIndexOf(`/node_modules/${hookName}`));
            }
            const hook_log_header = hookName;
            let origDontMerge = _.clone(dontMergeFields);
            const concatArrsFn = function (objValue, srcValue, key, object, source, stack) {
                const dontMergeIndex = _.findIndex(dontMergeFields, (o) => { return _.isString(o) ? _.isEqual(o, key) : !_.isEmpty(o[key]); });
                if (dontMergeIndex != -1) {
                    if (!_.isString(dontMergeFields[dontMergeIndex])) {
                        if (dontMergeFields[key] == "this_file") {
                            return srcValue;
                        }
                        else {
                            return objValue;
                        }
                    }
                    return srcValue;
                }
            };
            sails.log.verbose(`${hookName}::Merging configuration...`);
            _.each(config_dirs, (config_dir) => {
                config_dir = `${hook_root_dir}/${config_dir}`;
                sails.log.verbose(`${hook_log_header}::Looking at: ${config_dir}`);
                if (fs.pathExistsSync(config_dir)) {
                    const files = this.walkDirSync(config_dir, []);
                    sails.log.verbose(hook_log_header + "::Processing:");
                    sails.log.verbose(files);
                    _.each(files, (file_path) => {
                        const config_file = require(file_path);
                        const hasCustomDontMerge = _.findKey(config_file, "_dontMerge");
                        if (hasCustomDontMerge) {
                            dontMergeFields = dontMergeFields.concat(config_file[hasCustomDontMerge]['_dontMerge']);
                            _.unset(config_file[hasCustomDontMerge], "_dontMerge");
                        }
                        const hasDeleteFields = _.findKey(config_file, "_delete");
                        if (hasDeleteFields) {
                            _.each(config_file[hasDeleteFields]['_delete'], (toDelete) => {
                                _.unset(configMap[hasDeleteFields], toDelete);
                            });
                            _.unset(config_file[hasDeleteFields], "_delete");
                        }
                        _.mergeWith(configMap, config_file, concatArrsFn);
                        dontMergeFields = _.clone(origDontMerge);
                    });
                }
                else {
                    sails.log.verbose(hook_log_header + "::Skipping, directory not found:" + config_dir);
                }
            });
            sails.log.verbose(`${hook_log_header}::Merging configuration...complete.`);
            sails.log.verbose(`${hook_log_header}::Merging Translation file...`);
            const language_file_path = path_1.resolve("assets/locales/en/translation.json");
            const hook_language_file_path = path_1.resolve(hook_root_dir, "locales/en/translation.json");
            if (fs.pathExistsSync(language_file_path) && fs.pathExistsSync(hook_language_file_path)) {
                sails.log.verbose(hook_log_header + ":: Merging English translation file...");
                const mainTranslation = require(language_file_path);
                const hookTranslation = require(hook_language_file_path);
                _.merge(mainTranslation, hookTranslation);
                fs.writeFileSync(language_file_path, JSON.stringify(mainTranslation, null, 2));
            }
            if (fs.pathExistsSync(`${hook_root_dir}/assets/`)) {
                sails.log.verbose(`${hook_log_header}::Copying assets...`);
                fs.copySync(`${hook_root_dir}/assets/`, "assets/");
                fs.copySync(`${hook_root_dir}/assets/`, ".tmp/public/");
            }
            if (fs.pathExistsSync(`${hook_root_dir}/views/`)) {
                sails.log.verbose(`${hook_log_header}::Copying views...`);
                fs.copySync(`${hook_root_dir}/views/`, "views/");
            }
            if (fs.pathExistsSync(`${hook_root_dir}/api`) && !fs.pathExistsSync(`${hook_root_dir}/api/core`)) {
                sails.log.verbose(`${hook_log_header}::Adding Symlink to API core... ${hook_root_dir}/api/core -> ${appPath}/api/core`);
                fs.ensureSymlinkSync(`${appPath}/api/core`, `${hook_root_dir}/api/core`);
            }
            sails.log.verbose(`${hook_log_header}::Adding custom API elements...`);
            let apiDirs = ["services"];
            _.each(apiDirs, (apiType) => {
                const files = this.walkDirSync(`${hook_root_dir}/api/${apiType}`, []);
                sails.log.verbose(`${hook_log_header}::Processing '${apiType}':`);
                sails.log.verbose(JSON.stringify(files));
                if (!_.isEmpty(files)) {
                    _.each(files, (file) => {
                        const apiDef = require(file);
                        const apiElemName = _.toLower(path_1.basename(file, '.js'));
                        sails[apiType][apiElemName] = apiDef;
                    });
                }
            });
            sails.on('lifted', function () {
                let apiDirs = ["controllers"];
                _.each(apiDirs, (apiType) => {
                    const files = that.walkDirSync(`${hook_root_dir}/api/${apiType}`, []);
                    sails.log.verbose(`${hook_log_header}::Processing '${apiType}':`);
                    sails.log.verbose(JSON.stringify(files));
                    if (!_.isEmpty(files)) {
                        _.each(files, (file) => {
                            const apiDef = require(file);
                            const apiElemName = _.toLower(path_1.basename(file, '.js'));
                            sails[apiType][apiElemName] = apiDef;
                        });
                    }
                });
            });
            const modelFiles = this.walkDirSync(`${hook_root_dir}/api/models`, []);
            if (!_.isEmpty(modelFiles)) {
                _.each(modelFiles, (modelFile) => {
                    const dest = `${appPath}/api/models/${path_1.basename(modelFile)}`;
                    sails.log.verbose(`Copying ${modelFile} to ${dest}`);
                    fs.copySync(modelFile, dest);
                });
            }
            sails.log.verbose(`${hook_log_header}::Adding custom API elements...completed.`);
            sails.log.verbose(`${hookName}::Merge complete.`);
        }
        walkDirSync(dir, filelist = []) {
            if (!fs.pathExistsSync(dir)) {
                return filelist;
            }
            try {
                var files = fs.readdirSync(dir);
                _.each(files, (file) => {
                    const resolved = path_1.resolve(dir, file);
                    if (fs.statSync(resolved).isDirectory()) {
                        filelist = this.walkDirSync(resolved, filelist);
                    }
                    else {
                        filelist.push(resolved);
                    }
                });
            }
            catch (e) {
                sails.log.error(`Error walking directory: ${dir}`);
                sails.log.error(e);
            }
            return filelist;
        }
    }
    Services.Config = Config;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Config().exports();
