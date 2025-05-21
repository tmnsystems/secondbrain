"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileOperation = exports.GitOperation = void 0;
/**
 * Git operations supported by the executor
 */
var GitOperation;
(function (GitOperation) {
    GitOperation["CLONE"] = "clone";
    GitOperation["PULL"] = "pull";
    GitOperation["PUSH"] = "push";
    GitOperation["COMMIT"] = "commit";
    GitOperation["CHECKOUT"] = "checkout";
    GitOperation["BRANCH"] = "branch";
    GitOperation["MERGE"] = "merge";
    GitOperation["STATUS"] = "status";
    GitOperation["ADD"] = "add";
    GitOperation["INIT"] = "init";
})(GitOperation || (exports.GitOperation = GitOperation = {}));
/**
 * File operation types
 */
var FileOperation;
(function (FileOperation) {
    FileOperation["READ"] = "read";
    FileOperation["WRITE"] = "write";
    FileOperation["APPEND"] = "append";
    FileOperation["DELETE"] = "delete";
    FileOperation["COPY"] = "copy";
    FileOperation["MOVE"] = "move";
    FileOperation["STAT"] = "stat";
    FileOperation["LIST"] = "list";
    FileOperation["MKDIR"] = "mkdir";
    FileOperation["RMDIR"] = "rmdir";
    FileOperation["EXISTS"] = "exists";
})(FileOperation || (exports.FileOperation = FileOperation = {}));
