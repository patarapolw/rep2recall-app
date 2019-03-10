import { Db } from "./loki";

export interface IConfig {
    db?: Db;
}

export const config: IConfig = {};
export default config;
