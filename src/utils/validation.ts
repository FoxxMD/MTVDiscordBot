import Ajv from "ajv";
import {Logger} from "@foxxmd/winston";
import {MTVLogger} from "../common/logging.js";

export const createAjvFactory = (logger: MTVLogger): Ajv => {
    const validator =  new Ajv({logger, verbose: true, strict: "log", allowUnionTypes: true});
    // https://ajv.js.org/strict-mode.html#unknown-keywords
    validator.addKeyword('deprecationMessage');
    return validator;
}
