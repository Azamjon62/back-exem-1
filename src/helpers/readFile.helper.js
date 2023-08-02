import { readFileSync } from "fs";
import { join } from "path";


export const readFileSyncCustom = path => JSON.parse(readFileSync(join(process.cwd(), 'src', 'data', path)));


