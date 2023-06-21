import * as path from 'path';
import winston from "@foxxmd/winston";
//import {fileURLToPath} from "url";

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

export const projectDir = path.resolve(__dirname, '../../');
export const dataDir: string = process.env.DATA_DIR !== undefined ? path.resolve(process.env.DATA_DIR) :  path.resolve(projectDir, './data');


