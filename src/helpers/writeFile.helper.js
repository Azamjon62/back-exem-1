import { writeFileSync } from "fs";
import { join } from "path";

export const writeFileSyncCustom = (path, data) => {
    writeFileSync(join(process.cwd(), 'src', 'data', path), JSON.stringify(data, null, 4));
    return "Good"
}