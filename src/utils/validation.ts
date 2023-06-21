import Ajv from "ajv";
import {Logger} from "@foxxmd/winston";

export const createAjvFactory = (logger: Logger): Ajv => {
    const validator =  new Ajv({logger: logger, verbose: true, strict: "log", allowUnionTypes: true});
    // https://ajv.js.org/strict-mode.html#unknown-keywords
    validator.addKeyword('deprecationMessage');
    return validator;
}
